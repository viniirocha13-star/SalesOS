import { prisma } from "@/lib/prisma";
import { aiModelFor } from "@/lib/ai-models";
import type { AiTask } from "@/lib/ai-models";

/**
 * Detecta conversa difícil para telemetria.
 * Não troca de modelo: o atendimento comercial é sempre AI_SALES_MODEL (Luna).
 */
export async function routeComplexity(conversationId: string, signals: {
  consecutiveObjections: number;
  contradictions: boolean;
  lowConfidence: boolean;
  salesRequestedEscalation: boolean;
  longNegotiation: boolean;
  indecisive?: boolean;
  complexComparison?: boolean;
  highLossRisk?: boolean;
  exceptional?: boolean;
}): Promise<{ purpose: AiTask; reason: string | null }> {
  const reasons: string[] = [];
  if (signals.consecutiveObjections >= 3) reasons.push("multiple_objections");
  if (signals.contradictions) reasons.push("contradictions");
  if (signals.lowConfidence) reasons.push("low_confidence");
  if (signals.salesRequestedEscalation) reasons.push("sales_requested");
  if (signals.longNegotiation) reasons.push("long_negotiation");
  if (signals.indecisive) reasons.push("indecisive");
  if (signals.complexComparison) reasons.push("complex_comparison");
  if (signals.highLossRisk) reasons.push("high_loss_risk");
  if (signals.exceptional) reasons.push("exceptional");
  if (!reasons.length) return { purpose: "SALES", reason: null };

  const reason = reasons.join(",");
  const model = aiModelFor("SALES");
  await prisma.complexityEscalation.create({
    data: {
      conversationId,
      fromModel: model,
      toModel: model,
      reason: `same_model:${reason}`,
    },
  });
  return { purpose: "SALES", reason };
}
