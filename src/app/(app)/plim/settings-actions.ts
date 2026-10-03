"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimAdmin } from "@/lib/plim/profile";
import {
  getWorkspaceSettings,
  updateAffiliateConfig,
  updateGeneralSettings,
  updateIntegrationSecrets,
} from "@/lib/repositories/plim/settings";
import { AFFILIATE_ENV_KEYS } from "@/lib/plim/workspace-env";
import { addBlockedWord, removeBlockedWord } from "@/lib/repositories/plim/blocked-words";
import { upsertTemplate, listTemplates } from "@/lib/repositories/plim/templates";
import { getPlimWhatsAppProvider } from "@/lib/providers/plim-whatsapp";
import { getTelegramProvider } from "@/lib/providers/telegram";
import { getInstagramProvider } from "@/lib/providers/instagram";
import { getTelegramBotToken, getAffiliateEnvOverrides, getWorkspaceOpenAiModel } from "@/lib/plim/workspace-env";
import { isOpenAiConfigured } from "@/lib/plim/ai-text";
import { testMetaAdsConnection } from "@/lib/plim/meta-ads";
import { testChannelConnection } from "@/app/(app)/plim/operacao-actions";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  if (!canPlimAdmin(ctx.profile)) throw new Error("Sem permissão");
  return ctx;
}

export async function savePlimAffiliateSettings(formData: FormData) {
  const ctx = await requireAdmin();
  const config: Record<string, string> = {};
  for (const key of AFFILIATE_ENV_KEYS) {
    const v = formData.get(key)?.toString().trim();
    if (v) config[key] = v;
  }
  await updateAffiliateConfig(ctx.tenantId, config);
  revalidatePath("/plim/configuracoes");
}

export async function savePlimTrackingSettings(formData: FormData) {
  const ctx = await requireAdmin();
  const current = await getWorkspaceSettings(ctx.tenantId);
  const duplicateWindowHours = z.coerce.number().int().min(1).max(168).parse(formData.get("duplicateWindowHours"));
  const trackingBaseUrl = formData.get("trackingBaseUrl")?.toString().trim() || null;
  await updateGeneralSettings(ctx.tenantId, {
    workspaceName: current.workspaceName,
    timezone: current.timezone,
    testMode: current.testMode,
    duplicateWindowHours,
  });
  await updateIntegrationSecrets(ctx.tenantId, { trackingBaseUrl });
  revalidatePath("/plim/configuracoes");
}

export async function savePlimTelegramSettings(formData: FormData) {
  const ctx = await requireAdmin();
  const token = formData.get("telegramBotToken")?.toString().trim() || null;
  await updateIntegrationSecrets(ctx.tenantId, { telegramBotToken: token });
  revalidatePath("/plim/configuracoes");
}

export async function savePlimInstagramSettings(formData: FormData) {
  const ctx = await requireAdmin();
  const metaAdsToken = formData.get("metaAdsToken")?.toString().trim() || null;
  await updateIntegrationSecrets(ctx.tenantId, { metaAdsToken });
  revalidatePath("/plim/configuracoes");
}

export async function savePlimAiSettings(formData: FormData) {
  const ctx = await requireAdmin();
  const openAiModel = formData.get("openAiModel")?.toString().trim() || null;
  await updateIntegrationSecrets(ctx.tenantId, { openAiModel });
  revalidatePath("/plim/configuracoes");
}

export async function savePlimBlockedWord(formData: FormData) {
  const ctx = await requireAdmin();
  const word = z.string().min(1).parse(formData.get("word"));
  await addBlockedWord(ctx.tenantId, word);
  revalidatePath("/plim/configuracoes");
}

export async function removePlimBlockedWord(formData: FormData) {
  const ctx = await requireAdmin();
  const id = z.string().parse(formData.get("id"));
  await removeBlockedWord(ctx.tenantId, id);
  revalidatePath("/plim/configuracoes");
}

export async function savePlimTemplateFromSettings(formData: FormData) {
  const ctx = await requireAdmin();
  await upsertTemplate(ctx.tenantId, {
    id: formData.get("id")?.toString(),
    name: z.string().parse(formData.get("name")),
    body: z.string().parse(formData.get("body")),
    isDefault: formData.get("isDefault") === "on",
  });
  revalidatePath("/plim/configuracoes");
  revalidatePath("/plim/editor");
}

export async function testPlimWhatsAppSettings() {
  await requireAdmin();
  const s = await getPlimWhatsAppProvider().getStatus();
  if (!s.connected) return { ok: false as const, error: s.error ?? "WhatsApp não configurado (META_ACCESS_TOKEN / WHATSAPP_TOKEN)." };
  return testChannelConnection("WHATSAPP");
}

export async function testPlimTelegramSettings() {
  const ctx = await requireAdmin();
  const token = await getTelegramBotToken(ctx.tenantId);
  if (!token) return { ok: false as const, error: "Telegram não configurado. Salve o token ou defina TELEGRAM_BOT_TOKEN." };
  const s = await getTelegramProvider(token).getStatus();
  if (!s.ok) return { ok: false as const, error: s.error ?? "Falha ao conectar no Telegram." };
  return testChannelConnection("TELEGRAM");
}

export async function testPlimInstagramSettings() {
  await requireAdmin();
  return testChannelConnection("INSTAGRAM");
}

export async function testPlimAiSettings() {
  const ctx = await requireAdmin();
  if (!isOpenAiConfigured()) {
    return { ok: false as const, error: "OPENAI_API_KEY não configurada." };
  }
  const model = await getWorkspaceOpenAiModel(ctx.tenantId);
  return { ok: true as const, detail: model ? `Modelo: ${model}` : "Modelo padrão do ambiente" };
}

export async function testPlimAffiliateSettings(marketplaceEnv: string) {
  const ctx = await requireAdmin();
  const overrides = await getAffiliateEnvOverrides(ctx.tenantId);
  const v = overrides[marketplaceEnv] || process.env[marketplaceEnv]?.trim();
  if (!v) return { ok: false as const, error: `${marketplaceEnv} não configurado (salve nas configurações ou no .env).` };
  return { ok: true as const, detail: "Credencial presente (teste de conversão use Conversor de Links)." };
}

export async function testPlimMetaAdsSettings() {
  const ctx = await requireAdmin();
  const settings = await getWorkspaceSettings(ctx.tenantId);
  const token = settings.metaAdsToken?.trim() || process.env.META_ADS_TOKEN?.trim();
  if (!token) return { ok: false as const, error: "Meta Ads não configurado." };
  try {
    await testMetaAdsConnection(token);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function loadPlimTemplatesForSettings(tenantId: string) {
  return listTemplates(tenantId);
}
