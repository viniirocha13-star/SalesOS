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
    const lastExec = await prisma.aIExecution.findFirst({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
    });
    const ctxData = await buildCommercialContext(id, last?.body ?? "");
    const { getLaunchSnapshot } = await import("@/domain/launch-ready");
    const launch = await getLaunchSnapshot(ctxData.conv.leadId);
    const { openaiConfigured, modelFamily, parseLabStack } = await import("@/lib/ai-models");
    const { getLlmProvider } = await import("@/integrations/llm/provider");
    const execs = await prisma.aIExecution.findMany({ where: { conversationId: id } });
    const modelCounts = { terra: 0, sol: 0, luna: 0 };
    let conversationCostUsd = 0;
    for (const e of execs) {
      const fam = modelFamily(e.model);
      if (fam !== "other") modelCounts[fam] += 1;
      conversationCostUsd += e.estimatedCostUsd ?? 0;
    }
    const mem = await prisma.conversationMemory.findUnique({ where: { conversationId: id } });
    const labStack = parseLabStack((mem?.customerFacts as { lab_stack?: string } | null)?.lab_stack);
    return NextResponse.json({
      llm: openaiConfigured() ? "OPENAI" : getLlmProvider().name,
      model: lastExec?.model ?? decision?.model,
      labStack,
      modelCounts,
      conversationCostUsd,
      estimatedCostUsd: lastExec?.estimatedCostUsd ?? decision?.estimatedCostUsd,
      cachedTokens: lastExec?.cachedTokens ?? 0,
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
      tokens: {
        in: lastExec?.inputTokens ?? decision?.inputTokens,
        out: lastExec?.outputTokens ?? decision?.outputTokens,
        cached: lastExec?.cachedTokens ?? 0,
      },
      launch,
      source: ctxData.ranking.best_offer
        ? {
            bookId: ctxData.ranking.best_offer.bookId,
            sheet: ctxData.ranking.best_offer.sourceSheet,
            row: ctxData.ranking.best_offer.sourceRow,
            offerId: ctxData.ranking.best_offer.id,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
