import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { badRequest, notFound, readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { getDecryptedToken } from "@/wa/meta-connection";
import { sendTemplateMessage, sendTextMessage } from "@/integrations/meta/graph";
import { canSendFreeform } from "@/integrations/whatsapp/policy";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi(async (_req: Request, ctx: Ctx) => {
  const org = await requireOrg("inbox.view");
  const { id } = await ctx.params;
  const conversation = await prisma.waConversation.findFirst({
    where: { id, organizationId: org.organization.id },
    include: { contact: true, phoneNumber: true },
  });
  if (!conversation) throw notFound("Conversa");
  const messages = await prisma.waMessage.findMany({
    where: { conversationId: id, organizationId: org.organization.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ conversation, messages });
});

const postSchema = z.object({
  type: z.enum(["text", "template"]).default("text"),
  body: z.string().trim().max(4096).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  templateParams: z.array(z.string()).optional(),
});

export const POST = withApi(async (request: Request, ctx: Ctx) => {
  const org = await requireOrg("inbox.write");
  const { id } = await ctx.params;
  const body = postSchema.parse(await readJson(request));

  const conversation = await prisma.waConversation.findFirst({
    where: { id, organizationId: org.organization.id },
    include: { contact: true, phoneNumber: true },
  });
  if (!conversation) throw notFound("Conversa");
  if (conversation.contact.optedOutAt || conversation.contact.status === "OPTED_OUT") {
    throw badRequest("Contato em opt-out. Não é permitido enviar mensagens de campanha/atendimento promocional.");
  }

  const token = await getDecryptedToken(org.organization.id);
  if (!token) throw badRequest("Conecte a Meta antes de responder.");

  const policy = canSendFreeform(conversation.lastInboundAt);
  if (body.type === "text" && !policy.freeform) {
    throw badRequest("Janela de atendimento encerrada. Utilize um template aprovado.");
  }
  if (body.type === "text" && !body.body?.trim()) throw badRequest("Mensagem vazia.");
  if (body.type === "template" && !body.templateName) throw badRequest("Informe o template.");

  let providerMessageId = "";
  if (body.type === "template") {
    const tpl = await prisma.messageTemplate.findFirst({
      where: {
        organizationId: org.organization.id,
        name: body.templateName!,
        status: "APPROVED",
      },
    });
    if (!tpl) throw badRequest("Template não encontrado ou não aprovado.");
    const sent = await sendTemplateMessage({
      accessToken: token,
      phoneNumberId: conversation.phoneNumber.phoneNumberId,
      toE164: conversation.contact.phoneE164,
      templateName: tpl.name,
      language: body.templateLanguage || tpl.language,
      bodyParams: body.templateParams ?? [],
    });
    providerMessageId = sent.messages?.[0]?.id ?? `out-${Date.now()}`;
  } else {
    const sent = await sendTextMessage({
      accessToken: token,
      phoneNumberId: conversation.phoneNumber.phoneNumberId,
      toE164: conversation.contact.phoneE164,
      body: body.body!,
    });
    providerMessageId = sent.messages?.[0]?.id ?? `out-${Date.now()}`;
  }

  const message = await prisma.waMessage.create({
    data: {
      organizationId: org.organization.id,
      contactId: conversation.contactId,
      conversationId: conversation.id,
      phoneNumberId: conversation.phoneNumberId,
      direction: "OUTBOUND",
      type: body.type,
      providerMessageId,
      status: "SENT",
      body: body.type === "text" ? body.body : null,
      templateName: body.type === "template" ? body.templateName : null,
      sentAt: new Date(),
    },
  });

  await prisma.waConversation.update({
    where: { id: conversation.id },
    data: {
      lastOutboundAt: new Date(),
      lastMessagePreview: (body.body || body.templateName || "").slice(0, 120),
      unreadCount: 0,
    },
  });

  await audit({
    actorId: org.user.id,
    organizationId: org.organization.id,
    action: "inbox.reply",
    entity: "WaConversation",
    entityId: conversation.id,
    metadata: { type: body.type },
  });

  return NextResponse.json({ ok: true, message });
});
