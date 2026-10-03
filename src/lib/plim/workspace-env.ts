import { getWorkspaceSettings } from "@/lib/repositories/plim/settings";

const AFFILIATE_ENV_KEYS = [
  "PLIM_AMAZON_TAG",
  "PLIM_SHOPEE_AFFILIATE_ID",
  "PLIM_MERCADOLIVRE_TRACKING_ID",
  "PLIM_MAGALU_PARTNER_ID",
  "PLIM_ALIEXPRESS_TRACKING_ID",
  "PLIM_SHEIN_AFFILIATE_ID",
  "PLIM_AWIN_PUBLISHER_ID",
] as const;

export type AffiliateEnvKey = (typeof AFFILIATE_ENV_KEYS)[number];

export async function getAffiliateEnvOverrides(tenantId: string): Promise<Record<string, string>> {
  const settings = await getWorkspaceSettings(tenantId);
  const raw = settings.affiliateConfig;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const key of AFFILIATE_ENV_KEYS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

export function resolveAffiliateEnv(name: string, overrides?: Record<string, string>): string | undefined {
  const fromDb = overrides?.[name]?.trim();
  if (fromDb) return fromDb;
  return process.env[name]?.trim() || undefined;
}

export async function getTelegramBotToken(tenantId: string): Promise<string | undefined> {
  const settings = await getWorkspaceSettings(tenantId);
  const saved = settings.telegramBotToken?.trim();
  if (saved) return saved;
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined;
}

export async function getWorkspaceOpenAiModel(tenantId: string): Promise<string | undefined> {
  const settings = await getWorkspaceSettings(tenantId);
  return settings.openAiModel?.trim() || process.env.AI_UTILITY_MODEL?.trim() || undefined;
}

export async function getTrackingBaseUrl(tenantId: string): Promise<string | undefined> {
  const settings = await getWorkspaceSettings(tenantId);
  const saved = settings.trackingBaseUrl?.trim();
  if (saved) return saved.replace(/\/$/, "");
  const app = process.env.APP_URL?.trim() || process.env.AUTH_URL?.trim();
  return app ? app.replace(/\/$/, "") : undefined;
}

export { AFFILIATE_ENV_KEYS };
