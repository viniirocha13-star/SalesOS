/** Modelos só entram via env. Nunca espalhar IDs no restante do código. */
export type AiTask = "SALES" | "UTILITY" | "COMPLEX";

export function aiModelFor(task: AiTask): string {
  const map: Record<AiTask, string | undefined> = {
    SALES: process.env.AI_SALES_MODEL,
    UTILITY: process.env.AI_UTILITY_MODEL,
    COMPLEX: process.env.AI_COMPLEX_MODEL,
  };
  return map[task] || process.env.OPENAI_MODEL || "gpt-4o-mini";
}

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
