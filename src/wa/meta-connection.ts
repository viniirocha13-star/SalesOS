import type { MetaConnectionStatus, MetaTokenSource, PhoneNumberStatus, TemplateCategory, TemplateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CredentialVault } from "@/lib/credential-vault";
import { audit } from "@/lib/audit";
import {
  debugToken,
  exchangeEmbeddedSignupCode,
  listMessageTemplates,
  listOwnedWabas,
  listPhoneNumbers,
  listSharedWabas,
  subscribeWabaWebhooks,
  type GraphTemplate,
} from "@/integrations/meta/graph";
import { MetaApiError } from "@/integrations/meta/errors";

function mapPhoneStatus(raw?: string): PhoneNumberStatus {
  const u = (raw ?? "").toUpperCase();
  if (u.includes("CONNECTED") || u === "OK") return "CONNECTED";
  if (u.includes("PENDING") || u.includes("VERIFY")) return "VERIFICATION_PENDING";
  if (u.includes("REGISTER")) return "REGISTRATION_REQUIRED";
  if (u.includes("ERROR")) return "ERROR";
  return "DISCOVERED";
}

function mapTemplateStatus(raw: string): TemplateStatus {
  const u = raw.toUpperCase();
  if (u === "APPROVED") return "APPROVED";
  if (u === "PENDING" || u === "IN_APPEAL") return "PENDING";
  if (u === "REJECTED") return "REJECTED";
  if (u === "PAUSED") return "PAUSED";
  if (u === "DISABLED") return "DISABLED";
  return "DRAFT";
}

function mapCategory(raw: string): TemplateCategory {
  const u = raw.toUpperCase();
  if (u.includes("AUTH")) return "AUTHENTICATION";
  if (u.includes("MARKET")) return "MARKETING";
  return "UTILITY";
}

function extractBody(components: unknown): { body: string; header?: string; footer?: string; buttons?: unknown; headerType?: string } {
  if (!Array.isArray(components)) return { body: "" };
  let body = "";
  let header: string | undefined;
  let footer: string | undefined;
  let headerType: string | undefined;
  let buttons: unknown;
  for (const c of components as { type?: string; text?: string; format?: string; buttons?: unknown }[]) {
    const t = (c.type ?? "").toUpperCase();
    if (t === "BODY") body = c.text ?? "";
    if (t === "HEADER") {
      header = c.text;
      headerType = c.format;
    }
    if (t === "FOOTER") footer = c.text;
    if (t === "BUTTONS") buttons = c.buttons;
  }
  return { body, header, footer, buttons, headerType };
}

export async function getDecryptedToken(organizationId: string): Promise<string | null> {
  const conn = await prisma.metaConnection.findUnique({ where: { organizationId } });
  if (!conn?.encryptedAccessToken) return null;
  if (!CredentialVault.validate(conn.encryptedAccessToken)) return null;
  return CredentialVault.decrypt(conn.encryptedAccessToken);
}

export async function connectWithEmbeddedCode(input: {
  organizationId: string;
  userId: string;
  code: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
}) {
  const exchanged = await exchangeEmbeddedSignupCode(input.code);
  return persistConnection({
    organizationId: input.organizationId,
    userId: input.userId,
    accessToken: exchanged.access_token,
    expiresIn: exchanged.expires_in,
    source: "EMBEDDED_SIGNUP",
    wabaId: input.wabaId,
    phoneNumberId: input.phoneNumberId,
    businessId: input.businessId,
  });
}

export async function connectWithManualToken(input: {
  organizationId: string;
  userId: string;
  accessToken: string;
  wabaId?: string;
  businessId?: string;
}) {
  return persistConnection({
    organizationId: input.organizationId,
    userId: input.userId,
    accessToken: input.accessToken,
    source: "MANUAL",
    wabaId: input.wabaId,
    businessId: input.businessId,
  });
}

async function persistConnection(input: {
  organizationId: string;
  userId: string;
  accessToken: string;
  expiresIn?: number;
  source: MetaTokenSource;
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
}) {
  const encrypted = CredentialVault.encrypt(input.accessToken);
  const dbg = await debugToken(input.accessToken);
  const expiresAt =
    input.expiresIn != null
      ? new Date(Date.now() + input.expiresIn * 1000)
      : dbg?.data?.expires_at
        ? new Date(dbg.data.expires_at * 1000)
        : null;

  await prisma.metaConnection.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      status: "CONNECTING",
      tokenSource: input.source,
      encryptedAccessToken: encrypted,
      tokenExpiresAt: expiresAt,
      scopes: dbg?.data?.scopes ?? [],
      businessId: input.businessId,
      appId: process.env.META_APP_ID || dbg?.data?.app_id,
      connectedById: input.userId,
      lastError: null,
    },
    update: {
      status: "CONNECTING",
      tokenSource: input.source,
      encryptedAccessToken: encrypted,
      tokenExpiresAt: expiresAt,
      scopes: dbg?.data?.scopes ?? [],
      businessId: input.businessId ?? undefined,
      appId: process.env.META_APP_ID || dbg?.data?.app_id,
      connectedById: input.userId,
      lastError: null,
    },
  });

  await audit({
    actorId: input.userId,
    organizationId: input.organizationId,
    action: "meta.connect",
    entity: "MetaConnection",
    metadata: { source: input.source },
  });

  return syncMetaAssets(input.organizationId, {
    preferredWabaId: input.wabaId,
    preferredPhoneNumberId: input.phoneNumberId,
  });
}

export async function syncMetaAssets(
  organizationId: string,
  opts: { preferredWabaId?: string; preferredPhoneNumberId?: string } = {},
) {
  const token = await getDecryptedToken(organizationId);
  if (!token) {
    await prisma.metaConnection.update({
      where: { organizationId },
      data: { status: "NOT_CONNECTED", lastError: "Token ausente" },
    });
    throw new Error("Conecte a Meta antes de sincronizar.");
  }

  const conn = await prisma.metaConnection.findUniqueOrThrow({ where: { organizationId } });

  try {
    const [shared, owned] = await Promise.all([
      listSharedWabas(token).catch(() => ({ data: [] as { id: string; name?: string }[] })),
      listOwnedWabas(token).catch(() => ({ data: [] as { id: string; name?: string }[] })),
    ]);
    const wabaMap = new Map<string, { id: string; name?: string; currency?: string; timezone_id?: string; message_template_namespace?: string; account_review_status?: string }>();
    for (const w of [...(shared.data ?? []), ...(owned.data ?? [])]) wabaMap.set(w.id, w);
    if (opts.preferredWabaId && !wabaMap.has(opts.preferredWabaId)) {
      wabaMap.set(opts.preferredWabaId, { id: opts.preferredWabaId });
    }
    const wabas = [...wabaMap.values()];
    if (!wabas.length) {
      await prisma.metaConnection.update({
        where: { organizationId },
        data: {
          status: "ACTION_REQUIRED",
          lastError: "Nenhuma WhatsApp Business Account encontrada nesta autorização.",
          lastSyncedAt: new Date(),
        },
      });
      return { wabas: 0, phones: 0, templates: 0 };
    }

    let phoneCount = 0;
    let templateCount = 0;
    let businessName = conn.businessName;

    for (const w of wabas) {
      const wabaRow = await prisma.whatsAppBusinessAccount.upsert({
        where: { organizationId_wabaId: { organizationId, wabaId: w.id } },
        create: {
          organizationId,
          metaConnectionId: conn.id,
          wabaId: w.id,
          name: w.name,
          currency: w.currency,
          timezoneId: w.timezone_id,
          messageTemplateNamespace: w.message_template_namespace,
          accountReviewStatus: w.account_review_status,
          lastSyncedAt: new Date(),
        },
        update: {
          name: w.name ?? undefined,
          currency: w.currency ?? undefined,
          timezoneId: w.timezone_id ?? undefined,
          messageTemplateNamespace: w.message_template_namespace ?? undefined,
          accountReviewStatus: w.account_review_status ?? undefined,
          lastSyncedAt: new Date(),
        },
      });

      try {
        await subscribeWabaWebhooks(token, w.id);
        await prisma.whatsAppBusinessAccount.update({
          where: { id: wabaRow.id },
          data: { subscribedApp: true },
        });
      } catch {
        // inscrição de webhook pode falhar sem impedir o resto do sync
      }

      const phones = await listPhoneNumbers(token, w.id);
      for (const p of phones.data ?? []) {
        phoneCount += 1;
        const isPreferred = opts.preferredPhoneNumberId === p.id;
        await prisma.phoneNumber.upsert({
          where: { organizationId_phoneNumberId: { organizationId, phoneNumberId: p.id } },
          create: {
            organizationId,
            wabaId: wabaRow.id,
            phoneNumberId: p.id,
            displayPhoneNumber: p.display_phone_number ?? p.id,
            verifiedName: p.verified_name,
            status: mapPhoneStatus(p.status ?? p.code_verification_status),
            qualityRating: p.quality_rating,
            messagingLimitTier: p.messaging_limit_tier,
            nameStatus: p.name_status,
            codeVerificationStatus: p.code_verification_status,
            platformType: p.platform_type,
            isDefault: isPreferred,
            lastSyncedAt: new Date(),
          },
          update: {
            displayPhoneNumber: p.display_phone_number ?? undefined,
            verifiedName: p.verified_name ?? undefined,
            status: mapPhoneStatus(p.status ?? p.code_verification_status),
            qualityRating: p.quality_rating ?? undefined,
            messagingLimitTier: p.messaging_limit_tier ?? undefined,
            nameStatus: p.name_status ?? undefined,
            codeVerificationStatus: p.code_verification_status ?? undefined,
            platformType: p.platform_type ?? undefined,
            isDefault: isPreferred ? true : undefined,
            lastSyncedAt: new Date(),
          },
        });
      }

      const templates = await listMessageTemplates(token, w.id);
      for (const t of templates.data ?? []) {
        templateCount += 1;
        await upsertTemplateFromGraph(organizationId, wabaRow.id, t);
      }

      if (!businessName && w.name) businessName = w.name;
    }

    // garante um número padrão
    const defaultPhone = await prisma.phoneNumber.findFirst({
      where: { organizationId, isDefault: true },
    });
    if (!defaultPhone) {
      const first = await prisma.phoneNumber.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
      });
      if (first) {
        await prisma.phoneNumber.update({ where: { id: first.id }, data: { isDefault: true } });
      }
    } else if (opts.preferredPhoneNumberId) {
      await prisma.phoneNumber.updateMany({ where: { organizationId }, data: { isDefault: false } });
      await prisma.phoneNumber.updateMany({
        where: { organizationId, phoneNumberId: opts.preferredPhoneNumberId },
        data: { isDefault: true },
      });
    }

    const status: MetaConnectionStatus = phoneCount > 0 ? "CONNECTED" : "ACTION_REQUIRED";
    await prisma.metaConnection.update({
      where: { organizationId },
      data: {
        status,
        businessName: businessName ?? undefined,
        lastSyncedAt: new Date(),
        lastValidatedAt: new Date(),
        lastError: phoneCount > 0 ? null : "Conectado, mas nenhum número foi encontrado.",
      },
    });

    await audit({
      organizationId,
      action: "meta.sync",
      entity: "MetaConnection",
      metadata: { wabas: wabas.length, phones: phoneCount, templates: templateCount },
    });

    return { wabas: wabas.length, phones: phoneCount, templates: templateCount };
  } catch (error) {
    const message = error instanceof MetaApiError ? error.message : "Falha ao sincronizar ativos Meta.";
    const status: MetaConnectionStatus =
      error instanceof MetaApiError && error.code === 190 ? "TOKEN_EXPIRED" : "ERROR";
    await prisma.metaConnection.update({
      where: { organizationId },
      data: { status, lastError: message, lastSyncedAt: new Date() },
    });
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function upsertTemplateFromGraph(
  organizationId: string,
  wabaDbId: string,
  t: GraphTemplate,
) {
  const parts = extractBody(t.components);
  const category = mapCategory(t.category);
  const existing = await prisma.messageTemplate.findUnique({
    where: { wabaId_name_language: { wabaId: wabaDbId, name: t.name, language: t.language } },
  });
  const previousCategory =
    existing && existing.category !== category ? existing.category : existing?.previousCategory;

  return prisma.messageTemplate.upsert({
    where: { wabaId_name_language: { wabaId: wabaDbId, name: t.name, language: t.language } },
    create: {
      organizationId,
      wabaId: wabaDbId,
      metaTemplateId: t.id,
      name: t.name,
      language: t.language,
      category,
      requestedCategory: category,
      status: mapTemplateStatus(t.status),
      quality: t.quality_score?.score,
      rejectedReason: t.rejected_reason,
      body: parts.body || "(sem corpo)",
      headerText: parts.header,
      headerType: parts.headerType,
      footer: parts.footer,
      buttons: parts.buttons as object | undefined,
      components: t.components as object | undefined,
      lastSyncedAt: new Date(),
    },
    update: {
      metaTemplateId: t.id,
      category,
      previousCategory: previousCategory ?? undefined,
      status: mapTemplateStatus(t.status),
      quality: t.quality_score?.score ?? undefined,
      rejectedReason: t.rejected_reason ?? undefined,
      body: parts.body || undefined,
      headerText: parts.header,
      headerType: parts.headerType,
      footer: parts.footer,
      buttons: parts.buttons as object | undefined,
      components: t.components as object | undefined,
      lastSyncedAt: new Date(),
    },
  });
}

export async function disconnectMeta(organizationId: string, userId: string) {
  const conn = await prisma.metaConnection.findUnique({ where: { organizationId } });
  if (conn?.encryptedAccessToken) {
    await prisma.metaConnection.update({
      where: { organizationId },
      data: {
        status: "NOT_CONNECTED",
        encryptedAccessToken: CredentialVault.revoke(),
        lastError: null,
      },
    });
  } else {
    await prisma.metaConnection.upsert({
      where: { organizationId },
      create: { organizationId, status: "NOT_CONNECTED" },
      update: { status: "NOT_CONNECTED", encryptedAccessToken: null },
    });
  }
  await audit({
    actorId: userId,
    organizationId,
    action: "meta.disconnect",
    entity: "MetaConnection",
  });
}

export async function diagnoseMeta(organizationId: string) {
  const checks: { id: string; ok: boolean; detail: string }[] = [];
  const conn = await prisma.metaConnection.findUnique({ where: { organizationId } });
  checks.push({
    id: "meta_connected",
    ok: conn?.status === "CONNECTED",
    detail: conn ? `Status: ${conn.status}` : "Sem registro de conexão",
  });
  const tokenOk = CredentialVault.validate(conn?.encryptedAccessToken);
  checks.push({ id: "token_valid", ok: tokenOk, detail: tokenOk ? "Token descriptografável" : "Token ausente/inválido" });

  const waba = await prisma.whatsAppBusinessAccount.count({ where: { organizationId } });
  checks.push({ id: "waba", ok: waba > 0, detail: `${waba} WABA(s)` });

  const phones = await prisma.phoneNumber.count({ where: { organizationId, status: "CONNECTED" } });
  checks.push({ id: "phone", ok: phones > 0, detail: `${phones} número(s) conectado(s)` });

  const lastWh = await prisma.webhookEvent.findFirst({
    where: { organizationId },
    orderBy: { receivedAt: "desc" },
  });
  checks.push({
    id: "webhook",
    ok: Boolean(lastWh),
    detail: lastWh ? `Último evento ${lastWh.receivedAt.toLocaleString("pt-BR")}` : "Nenhum webhook recebido ainda",
  });

  if (tokenOk) {
    try {
      await syncMetaAssets(organizationId);
      checks.push({ id: "live_sync", ok: true, detail: "Sincronização ao vivo OK" });
    } catch (e) {
      checks.push({
        id: "live_sync",
        ok: false,
        detail: e instanceof Error ? e.message : "Falha no sync",
      });
    }
  }

  return {
    ok: checks.every((c) => c.ok),
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
    checks,
  };
}
