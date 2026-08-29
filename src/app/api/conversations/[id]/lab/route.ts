import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { buildCommercialContext } from "@/commercial/context";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("conversations.simulate");
    const { id } = await ctx.params;
    const last = await prisma.message.findFirst({
      where: { conversationId: id, direction: "INBOUND" },
      orderBy: { createdAt: "desc" },
    });
    const decision = await prisma.commercialDecision.findFirst({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
    });
    const ctxData = await buildCommercialContext(id, last?.body ?? "");
    const { getLaunchSnapshot } = await import("@/domain/launch-ready");
    const launch = await getLaunchSnapshot(ctxData.conv.leadId);
    return NextResponse.json({
      model: decision?.model,
      salesStage: ctxData.payload.SalesStage,
      buyingIntent: ctxData.payload.BuyingIntent,
      customerFacts: ctxData.payload.CustomerFacts,
      viability: ctxData.payload.Viability,
      eligibleOffers: ctxData.payload.EligibleOffers,
      presentedOffer: ctxData.payload.CurrentOffer,
      objection: ctxData.payload.Objections,
      allowedArguments: ctxData.payload.AllowedArguments,
      forbiddenClaims: ctxData.payload.ForbiddenClaims,
      toolsCalled: decision?.toolCalls ?? [],
      commercialAcceptance: ctxData.payload.CommercialAcceptance,
      requiredData: ctxData.payload.PendingInformation,
      preSaleStatus: ctxData.payload.PreSale,
      strategyLabel: decision?.strategyLabel ?? ctxData.strategy,
      escalationReason: decision?.escalationReason,
      latencyMs: decision?.latencyMs,
      tokens: { in: decision?.inputTokens, out: decision?.outputTokens },
      launch,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
