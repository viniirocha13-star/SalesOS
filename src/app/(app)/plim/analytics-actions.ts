"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { Role, PlimMarketplace } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite, canPlimAdmin } from "@/lib/plim/profile";
import { prisma } from "@/lib/prisma";
import { parseCommissionFile } from "@/lib/plim/commission-import";
import { parseContactFile } from "@/lib/plim/contact-import";
import { buildExclusionSet, filterImportableContacts } from "@/lib/plim/opt-out";
import { normalizePhone } from "@/lib/phone";
import { audit } from "@/lib/audit";
import { getPlimErrorHandler } from "@/lib/plim/error-retry";
import { z } from "zod";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  return { session, ctx };
}

export async function importCommissionFile(formData: FormData) {
  const { session, ctx } = await requireSession();
  if (!canPlimWrite(ctx.profile)) throw new Error("Sem permissão para importar comissões");
  const file = formData.get("file") as File | null;
  const marketplace = (formData.get("marketplace") as string) || "OUTRO";
  if (!file?.size) throw new Error("Selecione um arquivo CSV ou XLSX");
  const buf = Buffer.from(await file.arrayBuffer());
  const rows = parseCommissionFile(file.name, buf, marketplace as PlimMarketplace);
  const valid = rows.filter((r) => r.errors.length === 0);
  if (!valid.length) throw new Error("Nenhuma linha válida no arquivo");

  const groups = await prisma.plimGroup.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, externalId: true },
  });
  const groupByExternal = new Map(
    groups.filter((g) => g.externalId).map((g) => [g.externalId!, g.id]),
  );

  await prisma.plimCommissionEvent.createMany({
    data: valid.map((r) => ({
      tenantId: ctx.tenantId,
      marketplace: r.marketplace,
      orderId: r.orderId,
      productName: r.productName,
      amount: r.amount,
      commission: r.commission,
      subId: r.subId,
      groupId: r.groupExternalId ? groupByExternal.get(r.groupExternalId) ?? null : null,
      campaignId: r.subId,
      occurredAt: r.occurredAt,
      isDemo: false,
    })),
  });

  await audit({
    actorId: session.user.id,
    action: "plim.commission.import",
    entity: "PlimCommissionEvent",
    metadata: { fileName: file.name, rows: valid.length },
  });
  revalidatePath("/plim/comissoes");
  revalidatePath("/plim/resultados");
  return { imported: valid.length, skipped: rows.length - valid.length };
}

export async function importContactsFile(formData: FormData) {
  const { session, ctx } = await requireSession();
  if (!canPlimWrite(ctx.profile)) throw new Error("Sem permissão para importar contatos");
  const file = formData.get("file") as File | null;
  if (!file?.size) throw new Error("Selecione um arquivo");
  const buf = Buffer.from(await file.arrayBuffer());
  const rows = parseContactFile(file.name, buf).filter((r) => r.errors.length === 0 && r.phone);
  const exclusions = await prisma.plimExclusion.findMany({
    where: { tenantId: ctx.tenantId },
    select: { phone: true },
  });
  const excluded = buildExclusionSet(exclusions.map((e) => e.phone));
  const { accepted, blocked } = filterImportableContacts(rows, excluded);
  if (!accepted.length) {
    throw new Error(
      blocked.length
        ? "Todos os contatos estão em opt-out. Remova a exclusão para reimportar."
        : "Nenhum contato válido no arquivo",
    );
  }

  const groups = await prisma.plimGroup.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, externalId: true },
  });
  const groupByExternal = new Map(
    groups.filter((g) => g.externalId).map((g) => [g.externalId!, g.id]),
  );

  for (const row of accepted) {
    await prisma.plimContact.upsert({
      where: { tenantId_phone: { tenantId: ctx.tenantId, phone: row.phone } },
      create: {
        tenantId: ctx.tenantId,
        phone: row.phone,
        name: row.name,
        source: row.source,
        importedAt: row.importedAt,
        groupId: row.groupExternalId ? groupByExternal.get(row.groupExternalId) ?? null : null,
        consent: row.consent,
      },
      update: {
        name: row.name,
        source: row.source,
        importedAt: row.importedAt,
        groupId: row.groupExternalId ? groupByExternal.get(row.groupExternalId) ?? null : null,
        consent: row.consent,
      },
    });
  }

  await audit({
    actorId: session.user.id,
    action: "plim.contact.import",
    entity: "PlimContact",
    metadata: { fileName: file.name, imported: accepted.length, blocked: blocked.length },
  });
  revalidatePath("/plim/contatos");
  return { imported: accepted.length, blocked: blocked.length };
}

export async function addExclusion(phone: string, reason?: string) {
  const { session, ctx } = await requireSession();
  if (!canPlimWrite(ctx.profile)) throw new Error("Sem permissão");
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("Telefone inválido");
  await prisma.plimExclusion.upsert({
    where: { tenantId_phone: { tenantId: ctx.tenantId, phone: normalized } },
    create: { tenantId: ctx.tenantId, phone: normalized, reason: reason ?? null },
    update: { reason: reason ?? null },
  });
  await audit({
    actorId: session.user.id,
    action: "plim.exclusion.add",
    entity: "PlimExclusion",
    metadata: { phone: normalized },
  });
  revalidatePath("/plim/exclusoes");
  revalidatePath("/plim/contatos");
}

export async function removeExclusion(phone: string) {
  const { session, ctx } = await requireSession();
  if (!canPlimWrite(ctx.profile)) throw new Error("Sem permissão");
  const normalized = normalizePhone(phone);
  await prisma.plimExclusion.deleteMany({
    where: { tenantId: ctx.tenantId, phone: normalized },
  });
  await audit({
    actorId: session.user.id,
    action: "plim.exclusion.remove",
    entity: "PlimExclusion",
    metadata: { phone: normalized },
  });
  revalidatePath("/plim/exclusoes");
}

const campaignMapSchema = z.object({
  name: z.string().min(1).max(120),
  groupId: z.string().optional(),
  linkUrl: z.string().url().optional().or(z.literal("")),
  investment: z.coerce.number().min(0),
});

export async function saveCampaignMap(formData: FormData) {
  const { session, ctx } = await requireSession();
  if (!canPlimWrite(ctx.profile)) throw new Error("Sem permissão");
  const parsed = campaignMapSchema.parse({
    name: formData.get("name"),
    groupId: formData.get("groupId") || undefined,
    linkUrl: formData.get("linkUrl") || "",
    investment: formData.get("investment"),
  });
  const id = formData.get("id") as string | null;
  if (id) {
    await prisma.plimCampaignMap.update({
      where: { id, tenantId: ctx.tenantId },
      data: {
        name: parsed.name,
        groupId: parsed.groupId || null,
        linkUrl: parsed.linkUrl || null,
        investment: parsed.investment,
      },
    });
  } else {
    await prisma.plimCampaignMap.create({
      data: {
        tenantId: ctx.tenantId,
        name: parsed.name,
        groupId: parsed.groupId || null,
        linkUrl: parsed.linkUrl || null,
        investment: parsed.investment,
      },
    });
  }
  await audit({
    actorId: session.user.id,
    action: "plim.campaign_map.save",
    entity: "PlimCampaignMap",
    metadata: { name: parsed.name },
  });
  revalidatePath("/plim/resultados");
}

export async function saveMetaAdsToken(formData: FormData) {
  const { session, ctx } = await requireSession();
  if (!canPlimAdmin(ctx.profile)) throw new Error("Apenas administradores podem salvar o token");
  const token = String(formData.get("metaAdsToken") ?? "").trim();
  await prisma.plimWorkspaceSettings.update({
    where: { tenantId: ctx.tenantId },
    data: { metaAdsToken: token || null },
  });
  await audit({
    actorId: session.user.id,
    action: "plim.meta_ads.token_save",
    entity: "PlimWorkspaceSettings",
    metadata: { configured: Boolean(token) },
  });
  revalidatePath("/plim/resultados");
}

export async function retryPlimError(errorLogId: string) {
  const { session, ctx } = await requireSession();
  if (!canPlimWrite(ctx.profile)) throw new Error("Sem permissão");
  const row = await prisma.plimErrorLog.findFirst({
    where: { id: errorLogId, tenantId: ctx.tenantId },
  });
  if (!row) throw new Error("Registro não encontrado");
  const handler = getPlimErrorHandler(row.handlerKey);
  if (!handler) throw new Error("Nenhum handler registrado para esta ação");
  try {
    await handler(row.payload);
    await prisma.plimErrorLog.update({
      where: { id: row.id },
      data: { resolved: true, attempts: row.attempts + 1, lastAttemptAt: new Date() },
    });
    await audit({
      actorId: session.user.id,
      action: "plim.error.retry",
      entity: "PlimErrorLog",
      entityId: row.id,
    });
    revalidatePath("/plim/historico");
    return { ok: true };
  } catch (e) {
    await prisma.plimErrorLog.update({
      where: { id: row.id },
      data: {
        attempts: row.attempts + 1,
        lastAttemptAt: new Date(),
        error: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}
