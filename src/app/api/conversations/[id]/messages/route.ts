import { NextResponse } from "next/server";
import { handleInboundMessage } from "@/ai/sales-agent";
import { requirePermission, errorResponse } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import "@/events/handlers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("conversations.simulate");
    const { id } = await ctx.params;
    const conversation = await prisma.conversation.findUnique({ where: { id } });
    if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    const { body } = (await request.json()) as { body: string };
    const result = await handleInboundMessage({ conversationId: id, body });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
