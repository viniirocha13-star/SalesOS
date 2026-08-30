/** Um único modelo comercial. IDs só via env — nunca Terra. */

export type AiTask = "SALES" | "UTILITY" | "COMPLEX";

const LUNA = "gpt-5.6-luna";

function isForbiddenModel(id: string) {
  return /terra|gpt-5\.6-sol\b/i.test(id);
}

/** Atendimento comercial, utilitário e casos difíceis usam o mesmo ID. */
export function salesModelId(): string {
  const requested = (process.env.AI_SALES_MODEL || process.env.OPENAI_MODEL || LUNA).trim();
  if (!requested || isForbiddenModel(requested)) return LUNA;
  return requested;
}

export function aiModelFor(task: AiTask = "SALES"): string {
  void task;
  return salesModelId();
}

/** Effort baixo em todas as chamadas — menor custo. */
export function reasoningEffortFor(task: AiTask = "SALES"): "low" | "medium" | "high" {
  void task;
  const raw = process.env.AI_SALES_REASONING_EFFORT;
  if (raw === "medium" || raw === "high") return raw;
  return "low";
}

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
