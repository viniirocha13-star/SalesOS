import { z } from "zod";
import type { TemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { getDecryptedToken, syncMetaAssets, upsertTemplateFromGraph } from "@/wa/meta-connection";
import { createMessageTemplate, listMessageTemplates } from "@/integrations/meta/graph";
import { badRequest, notFound } from "@/lib/api-error";

const NAME_RE = /^[a-z0-9_]+$/;

export const templateDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .regex(NAME_RE, "Nome deve ser minúsculo, números e underscore (ex.: pedido_enviado)"),
  language: z.string().default("pt_BR"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  headerText: z.string().trim().max(60).optional().nullable(),
  body: z.string().trim().min(1).max(1024),
  footer: z.string().trim().max(60).optional().nullable(),
  exampleValues: z.array(z.string()).optional(),
  wabaDbId: z.string().optional(),
});

export type TemplateDraft = z.infer<typeof templateDraftSchema>;

export type TemplateValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  variables: number[];
};

/** Validador local antes do envio à Meta — não garante aprovação. */
export function validateTemplateLocal(input: {
  name: string;
  category: TemplateCategory | string;
  body: string;
  headerText?: string | null;
  footer?: string | null;
  exampleValues?: string[];
}): TemplateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!NAME_RE.test(input.name)) {
    errors.push("Nome inválido: use apenas a-z, 0-9 e underscore.");
  }
  if (!input.body.trim()) errors.push("Corpo da mensagem é obrigatório.");
  if (input.body.length > 1024) errors.push("Corpo excede 1024 caracteres.");
  if (input.headerText && input.headerText.length > 60) errors.push("Cabeçalho excede 60 caracteres.");
  if (input.footer && input.footer.length > 60) errors.push("Rodapé excede 60 caracteres.");

  const vars = [...input.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  const unique = [...new Set(vars)].sort((a, b) => a - b);
  for (let i = 0; i < unique.length; i++) {
    if (unique[i] !== i + 1) {
      errors.push("Variáveis devem ser sequenciais a partir de {{1}}.");
      break;
    }
  }
  if (unique.length && (!input.exampleValues || input.exampleValues.length < unique.length)) {
    errors.push("Informe um valor de exemplo para cada variável.");
  }
  if (input.category === "AUTHENTICATION" && unique.length === 0) {
    warnings.push("Templates de autenticação costumam incluir o código como variável.");
  }
  if (input.category === "MARKETING") {
    warnings.push(
      "Marketing é cobrado pela Meta conforme mercado/categoria. Não tente classificar como utilidade para reduzir custo.",
    );
  }
  if (/\b(grátis|gratis|desconto|promo)\b/i.test(input.body) && input.category === "UTILITY") {
    warnings.push(
      "O texto parece promocional. A Meta pode recategorizar para Marketing — use a categoria adequada.",
    );
  }

  return { ok: errors.length === 0, errors, warnings, variables: unique };
}

export function applyExampleValues(body: string, examples: string[] = []) {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => examples[Number(n) - 1] ?? `{{${n}}}`);
}

export async function syncTemplatesForOrg(organizationId: string, userId?: string) {
  const token = await getDecryptedToken(organizationId);
  if (!token) throw badRequest("Conecte a Meta antes de sincronizar templates.");

  // Garante WABAs atualizadas
  await syncMetaAssets(organizationId);

  const wabas = await prisma.whatsAppBusinessAccount.findMany({ where: { organizationId } });
  let count = 0;
  for (const w of wabas) {
    const remote = await listMessageTemplates(token, w.wabaId);
    for (const t of remote.data ?? []) {
      await upsertTemplateFromGraph(organizationId, w.id, t);
      count += 1;
    }
  }

  if (userId) {
    await audit({
      actorId: userId,
      organizationId,
      action: "templates.sync",
      entity: "MessageTemplate",
      metadata: { count },
    });
  }
  return { count };
}

export async function createDraftTemplate(organizationId: string, userId: string, raw: TemplateDraft) {
  const input = templateDraftSchema.parse(raw);
  const validation = validateTemplateLocal(input);
  if (!validation.ok) throw badRequest("Template inválido", validation);

  const waba = input.wabaDbId
    ? await prisma.whatsAppBusinessAccount.findFirst({
        where: { id: input.wabaDbId, organizationId },
      })
    : await prisma.whatsAppBusinessAccount.findFirst({ where: { organizationId } });
  if (!waba) throw badRequest("Nenhuma WABA conectada. Conecte a Meta primeiro.");

  const existing = await prisma.messageTemplate.findUnique({
    where: {
      wabaId_name_language: { wabaId: waba.id, name: input.name, language: input.language },
    },
  });
  if (existing) throw badRequest("Já existe um template com este nome e idioma nesta WABA.");

  const tpl = await prisma.messageTemplate.create({
    data: {
      organizationId,
      wabaId: waba.id,
      name: input.name,
      language: input.language,
      category: input.category,
      requestedCategory: input.category,
      status: "DRAFT",
      body: input.body,
      headerText: input.headerText || null,
      headerType: input.headerText ? "TEXT" : null,
      footer: input.footer || null,
      exampleValues: input.exampleValues ?? [],
      variables: validation.variables,
    },
  });

  await audit({
    actorId: userId,
    organizationId,
    action: "template.create",
    entity: "MessageTemplate",
    entityId: tpl.id,
  });

  return { template: tpl, validation };
}

export async function submitTemplateToMeta(organizationId: string, userId: string, templateId: string) {
  const tpl = await prisma.messageTemplate.findFirst({
    where: { id: templateId, organizationId },
    include: { waba: true },
  });
  if (!tpl) throw notFound("Template");
  if (tpl.status !== "DRAFT" && tpl.status !== "REJECTED") {
    throw badRequest("Só é possível enviar rascunhos ou rejeitados para nova análise.");
  }

  const validation = validateTemplateLocal({
    name: tpl.name,
    category: tpl.category,
    body: tpl.body,
    headerText: tpl.headerText,
    footer: tpl.footer,
    exampleValues: Array.isArray(tpl.exampleValues) ? (tpl.exampleValues as string[]) : [],
  });
  if (!validation.ok) throw badRequest("Template inválido", validation);

  const token = await getDecryptedToken(organizationId);
  if (!token) throw badRequest("Conecte a Meta antes de enviar o template.");

  const examples = Array.isArray(tpl.exampleValues) ? (tpl.exampleValues as string[]) : [];
  const components: Record<string, unknown>[] = [];
  if (tpl.headerText) {
    components.push({ type: "HEADER", format: "TEXT", text: tpl.headerText });
  }
  components.push({
    type: "BODY",
    text: tpl.body,
    ...(validation.variables.length
      ? { example: { body_text: [validation.variables.map((i) => examples[i - 1] ?? `ex${i}`)] } }
      : {}),
  });
  if (tpl.footer) components.push({ type: "FOOTER", text: tpl.footer });

  const created = await createMessageTemplate(token, tpl.waba.wabaId, {
    name: tpl.name,
    language: tpl.language,
    category: tpl.category,
    components,
  });

  const updated = await prisma.messageTemplate.update({
    where: { id: tpl.id },
    data: {
      metaTemplateId: created.id,
      status: "PENDING",
      lastSyncedAt: new Date(),
      rejectedReason: null,
    },
  });

  await audit({
    actorId: userId,
    organizationId,
    action: "template.submit",
    entity: "MessageTemplate",
    entityId: tpl.id,
    metadata: { metaTemplateId: created.id },
  });

  return updated;
}
