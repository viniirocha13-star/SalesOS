import { prisma } from "@/lib/prisma";
import {
  aiModelFor,
  complexRoutingEnabled,
  maxSolCallsPerConversation,
  type AiTask,
  type LabStack,
} from "@/lib/ai-models";

export type ComplexitySignals = {
  consecutiveObjections: number;
  unresolvedPriceObjection?: boolean;
  contradictions: boolean;
  lowConfidence: boolean;
  salesRequestedEscalation: boolean;
  longNegotiation: boolean;
  indecisive?: boolean;
  complexComparison?: boolean;
  highLossRisk?: boolean;
  exceptional?: boolean;
  highIntentHesitating?: boolean;
  stackedPriceLoyaltyCompetitor?: boolean;
  terraStalled?: boolean;
  inbound?: string;
  salesStage?: string;
  labStack?: LabStack | null;
};

const UTILITY_TURN =
  /^(oi|ol[aá]|bom dia|boa tarde|boa noite)$|cidade|bairro|cep|cpf|meu nome|chamo|rua |avenida |\b\d{5}-?\d{3}\b|quanto (custa|fica) (o )?plano/i;

export function isUtilityTurn(text: string, salesStage?: string): boolean {
  if (salesStage === "DATA_COLLECTION" || salesStage === "PRE_SALE_READY") return true;
  const t = text.trim();
  if (t.length <= 24 && UTILITY_TURN.test(t)) return true;
  if (/^(fortaleza|caucaia|maranguape|natal|recife)$/i.test(t)) return true;
  return false;
}

export function shouldEscalateToSol(signals: ComplexitySignals): string[] {
  const reasons: string[] = [];
  if (signals.consecutiveObjections >= 2) reasons.push("multiple_objections");
  if (signals.unresolvedPriceObjection) reasons.push("unresolved_price");
  if (signals.highIntentHesitating) reasons.push("high_intent_hesitating");
  if (signals.complexComparison) reasons.push("complex_comparison");
  if (signals.stackedPriceLoyaltyCompetitor) reasons.push("price_loyalty_competitor");
  if (signals.terraStalled) reasons.push("terra_stalled");
  if (signals.highLossRisk) reasons.push("high_loss_risk");
  if (signals.lowConfidence) reasons.push("low_confidence");
  if (signals.contradictions) reasons.push("contradictions");
  if (signals.salesRequestedEscalation) reasons.push("sales_requested");
  if (signals.longNegotiation) reasons.push("long_negotiation");
  if (signals.indecisive) reasons.push("indecisive");
  if (signals.exceptional) reasons.push("exceptional");
  return reasons;
}

export async function routeComplexity(
  conversationId: string,
  signals: ComplexitySignals,
): Promise<{ purpose: AiTask; reason: string | null; model: string; solUsed: boolean }> {
  const inbound = signals.inbound ?? "";
  if (isUtilityTurn(inbound, signals.salesStage)) {
    return { purpose: "SALES", reason: null, model: aiModelFor("SALES", signals.labStack), solUsed: false };
  }
  if (!complexRoutingEnabled(signals.labStack)) {
    return { purpose: "SALES", reason: null, model: aiModelFor("SALES", signals.labStack), solUsed: false };
  }

  const reasons = shouldEscalateToSol(signals);
  if (!reasons.length) {
    return { purpose: "SALES", reason: null, model: aiModelFor("SALES", signals.labStack), solUsed: false };
  }

  const used = await prisma.complexityEscalation.count({
    where: { conversationId, toModel: { contains: "sol" } },
  });
  if (used >= maxSolCallsPerConversation()) {
    return {
      purpose: "SALES",
      reason: `sol_cap_reached:${reasons.join(",")}`,
      model: aiModelFor("SALES", signals.labStack),
      solUsed: false,
    };
  }

  const fromModel = aiModelFor("SALES", signals.labStack);
  const toModel = aiModelFor("COMPLEX", signals.labStack);
  const reason = reasons.join(",");
  await prisma.complexityEscalation.create({
    data: {
      conversationId,
      fromModel,
      toModel,
      reason,
    },
  });
  return { purpose: "COMPLEX", reason, model: toModel, solUsed: true };
}
