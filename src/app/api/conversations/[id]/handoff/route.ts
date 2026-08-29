import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("conversations.simulate");
    const { id } = await ctx.params;
    await prisma.conversation.update({
      where: { id },
      data: { status: "HANDOFF_HUMANO", ownerId: user.id, aiEnabled: false, salesStage: "HUMAN_HANDOFF", lockOwnerId: user.id },
    });
    await prisma.humanHandoff.create({
      data: { conversationId: id, reason: "CLIENTE_SOLICITOU", assignedToId: user.id },
    });
    await audit({ actorId: user.id, action: "handoff.open", entity: "Conversation", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("conversations.simulate");
    const { id } = await ctx.params;
    const conv = await prisma.conversation.findUniqueOrThrow({
      where: { id },
      include: { messages: { where: { actor: "HUMAN" }, orderBy: { createdAt: "desc" }, take: 8 } },
    });
    const summary = conv.messages.map((m) => m.body).join(" | ").slice(0, 1000);
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
    await audit({ actorId: user.id, action: "handoff.return_ai", entity: "Conversation", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
