import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { canSendFreeform } from "@/integrations/whatsapp/policy";
import { audit } from "@/lib/audit";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("conversations.view");
    const { id } = await ctx.params;
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: { include: { viabilityChecks: true, objections: true, preSales: { include: { offer: true } } } },
        messages: { orderBy: { createdAt: "asc" }, take: 200 },
        memory: true,
      },
    });
    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } });
    return NextResponse.json(conv);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("assume_conversation");
    const { id } = await ctx.params;
    const { body } = (await request.json()) as { body: string };
    const conv = await prisma.conversation.findUniqueOrThrow({ where: { id }, include: { lead: true } });
    if (conv.aiEnabled) {
      return NextResponse.json({ error: "Assuma a conversa antes de responder." }, { status: 409 });
    }
    const created = await prisma.message.create({
      data: {
        conversationId: id,
        direction: "OUTBOUND",
        actor: "HUMAN",
        body,
        status: "QUEUED",
      },
    });
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date(), ownerId: user.id },
    });
    if (conv.channel === "WHATSAPP") {
      const { enqueueSendWhatsApp } = await import("@/workers/queue");
      if (canSendFreeform(conv.lastInboundAt).freeform) {
        await enqueueSendWhatsApp(created.id);
      }
    } else {
      await prisma.message.update({ where: { id: created.id }, data: { status: "SENT" } });
    }
    await audit({ actorId: user.id, action: "inbox.human_reply", entity: "Conversation", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
