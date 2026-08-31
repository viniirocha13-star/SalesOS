export type AiTask = "SALES" | "UTILITY" | "COMPLEX";
export type LabStack = "luna" | "terra" | "terra_sol";

export const TERRA_MODEL = "gpt-5.6-terra";
export const SOL_MODEL = "gpt-5.6-sol";
export const LUNA_MODEL = "gpt-5.6-luna";

function clean(value?: string | null) {
  return (value ?? "").trim();
}

export function salesModelId(): string {
  return clean(process.env.AI_SALES_MODEL) || clean(process.env.OPENAI_MODEL) || TERRA_MODEL;
}

export function complexModelId(): string {
  return clean(process.env.AI_COMPLEX_MODEL) || SOL_MODEL;
}

export function utilityModelId(): string {
  return clean(process.env.AI_UTILITY_MODEL) || LUNA_MODEL;
}

export function complexRoutingEnabled(labStack?: LabStack | null): boolean {
  if (labStack === "luna" || labStack === "terra") return false;
  if (labStack === "terra_sol") return true;
  const raw = clean(process.env.AI_COMPLEX_ENABLED).toLowerCase();
  if (raw === "false" || raw === "0") return false;
  return raw === "true" || raw === "1" || Boolean(clean(process.env.AI_COMPLEX_MODEL));
}

export function maxSolCallsPerConversation(): number {
  const n = Number(process.env.MAX_SOL_CALLS_PER_CONVERSATION ?? 2);
  return Number.isFinite(n) && n >= 0 ? n : 2;
}

export function aiModelFor(task: AiTask = "SALES", labStack?: LabStack | null): string {
  if (labStack === "luna") return LUNA_MODEL;
  if (labStack === "terra") return task === "UTILITY" ? utilityModelId() : TERRA_MODEL;
  if (task === "COMPLEX") return complexModelId();
  if (task === "UTILITY") return utilityModelId();
  return salesModelId();
}

export function reasoningEffortFor(task: AiTask = "SALES"): "none" | "low" | "medium" | "high" {
  if (task === "COMPLEX") {
    const raw = process.env.AI_COMPLEX_REASONING_EFFORT;
    if (raw === "none" || raw === "low" || raw === "medium" || raw === "high") return raw;
    return "low";
  }
  const raw = process.env.AI_SALES_REASONING_EFFORT;
  if (raw === "none" || raw === "medium" || raw === "high") return raw;
  return "low";
}

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function parseLabStack(value: unknown): LabStack | null {
  if (value === "luna" || value === "terra" || value === "terra_sol") return value;
  return null;
}

export function modelFamily(model: string): "terra" | "sol" | "luna" | "other" {
  if (/terra/i.test(model)) return "terra";
  if (/sol/i.test(model)) return "sol";
  if (/luna/i.test(model)) return "luna";
  return "other";
}
