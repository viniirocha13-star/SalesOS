export type ProdRole = "web" | "worker";

const WEB_KEYS = [
  "DATABASE_URL",
  "REDIS_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "APP_URL",
  "OPENAI_API_KEY",
  "AI_SALES_MODEL",
] as const;

const WORKER_KEYS = ["DATABASE_URL", "REDIS_URL", "OPENAI_API_KEY", "AI_SALES_MODEL"] as const;

function present(value?: string) {
  return Boolean(value && value.trim());
}

export function encryptionKeyConfigured(env: NodeJS.ProcessEnv = process.env) {
  return present(env.ENCRYPTION_KEY) || present(env.APP_ENCRYPTION_KEY);
}

export function missingProductionEnv(role: ProdRole, env: NodeJS.ProcessEnv = process.env): string[] {
  const keys = role === "web" ? WEB_KEYS : WORKER_KEYS;
  const missing: string[] = keys.filter((key) => !present(env[key]));
  if (!encryptionKeyConfigured(env)) missing.push("ENCRYPTION_KEY|APP_ENCRYPTION_KEY");
  return missing;
}

export function assertProdEnv(role: ProdRole, env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== "production") return;
  const missing = missingProductionEnv(role, env);
  if (missing.length) {
    throw new Error(`ENV_VALIDATION_FAILED role=${role} missing=${missing.join(",")}`);
  }
}
