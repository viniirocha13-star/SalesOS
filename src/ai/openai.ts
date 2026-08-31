import { getLlmProvider, type LlmMessage, type LlmResult, type LlmTool } from "@/integrations/llm/provider";
import { prisma } from "@/lib/prisma";
import { aiModelFor } from "@/lib/ai-models";

export async function createSalesResponse(input: {
  messages: LlmMessage[];
  tools: LlmTool[];
  purpose?: "SALES" | "UTILITY" | "COMPLEX";
}): Promise<LlmResult> {
  return getLlmProvider().complete({ ...input, purpose: input.purpose ?? "SALES" });
}

export async function createUtilityResponse(input: { messages: LlmMessage[]; tools?: LlmTool[] }): Promise<LlmResult> {
  return getLlmProvider().complete({ messages: input.messages, tools: input.tools ?? [], purpose: "UTILITY" });
}

export async function createSummary(text: string): Promise<string> {
  const result = await createUtilityResponse({
    messages: [
      {
        role: "system",
        content:
          "Resuma a conversa comercial em português. Preserve cidade, oferta apresentada, aceite, objeções, endereço e fatos críticos. Sem inventar.",
      },
      { role: "user", content: text.slice(0, 12000) },
    ],
  });
  return result.content.trim();
}

export async function estimateCostUsd(model: string, inputTokens = 0, outputTokens = 0, cachedTokens = 0) {
  const row = await prisma.modelPrice.findUnique({ where: { model } }).catch(() => null);
  const inputPerM = row?.inputPerMTok ?? 0.15;
  const outputPerM = row?.outputPerMTok ?? 0.6;
  return (inputTokens * inputPerM + outputTokens * outputPerM + cachedTokens * inputPerM * 0.1) / 1_000_000;
}

export function salesModel() {
  return aiModelFor("SALES");
}
