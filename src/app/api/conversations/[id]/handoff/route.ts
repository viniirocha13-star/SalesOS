import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";
import { createSummary } from "@/ai/openai";
import { refreshConversationMemory } from "@/ai/memory";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("assume_conversation");
    const { id } = await ctx.params;
    await prisma.conversation.update({
      where: { id },
      data: {
        status: "HANDOFF_HUMANO",
        ownerId: user.id,
        aiEnabled: false,
        salesStage: "HUMAN_HANDOFF",
        lockOwnerId: user.id,
      },
    });
    await prisma.humanHandoff.create({
      data: { conversationId: id, reason: "CLIENTE_SOLICITOU", assignedToId: user.id, status: "EM_ATENDIMENTO" },
    });
    await prisma.message.create({
      data: {
        conversationId: id,
        direction: "OUTBOUND",
        actor: "SYSTEM",
        body: "Um operador assumiu esta conversa. A IA está pausada.",
        status: "SENT",
      },
    });
    await audit({ actorId: user.id, action: "handoff.open", entity: "Conversation", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("assume_conversation");
    const { id } = await ctx.params;
    const conv = await prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: { messages: { where: { actor: "HUMAN" }, orderBy: { createdAt: "desc" }, take: 12 } },
    });
    const blob = conv.messages.map((m) => m.body).join("\n");
    let summary = blob.slice(0, 800);
    try {
      if (blob.trim()) summary = await createSummary(`Intervenção humana:\n${blob}`);
    } catch {
      /* keep local summary */
    }
    await refreshConversationMemory(id, { important_facts: summary });
    await prisma.conversationMemory.upsert({
      where: { conversationId: id },
      create: { conversationId: id, summary: `Intervenção humana: ${summary}` },
      update: { summary: `Intervenção humana: ${summary}` },
    });
    await prisma.conversation.update({
      where: { id },
      data: { status: "IA_ATIVA", aiEnabled: true, lockOwnerId: null, salesStage: "NEGOTIATION" },
    });
    await prisma.humanHandoff.updateMany({
      where: { conversationId: id, status: { in: ["ABERTO", "EM_ATENDIMENTO"] } },
      data: { status: "DEVOLVIDO_IA", resolvedAt: new Date() },
    });
    await prisma.message.create({
      data: {
        conversationId: id,
        direction: "OUTBOUND",
        actor: "SYSTEM",
        body: "Conversa devolvida para a IA. A próxima mensagem do cliente será atendida automaticamente.",
        status: "SENT",
      },
    });
    await audit({ actorId: user.id, action: "handoff.return_ai", entity: "Conversation", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
