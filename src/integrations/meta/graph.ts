/**
 * Cliente Graph API — apenas endpoints oficiais documentados.
 * Versão configurável via META_GRAPH_VERSION (padrão v21.0).
 */
import { MetaApiError, translateMetaError } from "@/integrations/meta/errors";

const DEFAULT_VERSION = "v21.0";

export function graphVersion() {
  return process.env.META_GRAPH_VERSION || DEFAULT_VERSION;
}

export function graphBase() {
  return `https://graph.facebook.com/${graphVersion()}`;
}

type GraphOptions = {
  accessToken: string;
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  searchParams?: Record<string, string | undefined>;
};

export async function graphFetch<T = unknown>(path: string, opts: GraphOptions): Promise<T> {
  const url = new URL(`${graphBase()}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(opts.searchParams ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  if (opts.method === "GET" || !opts.method) {
    url.searchParams.set("access_token", opts.accessToken);
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers:
      opts.method && opts.method !== "GET"
        ? {
            Authorization: `Bearer ${opts.accessToken}`,
            "Content-Type": "application/json",
          }
        : undefined,
    body: opts.method && opts.method !== "GET" && opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: {
      message?: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      fbtrace_id?: string;
      error_user_title?: string;
      error_user_msg?: string;
    };
  } & T;

  if (!res.ok || json.error) {
    const err = json.error ?? { message: `HTTP ${res.status}`, code: res.status };
    throw new MetaApiError(translateMetaError(err), {
      httpStatus: res.status,
      code: err.code,
      subcode: err.error_subcode,
      type: err.type,
      fbtraceId: err.fbtrace_id,
      providerMessage: err.message,
    });
  }
  return json as T;
}

export type GraphWaba = {
  id: string;
  name?: string;
  currency?: string;
  timezone_id?: string;
  message_template_namespace?: string;
  account_review_status?: string;
};

export type GraphPhone = {
  id: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  messaging_limit_tier?: string;
  name_status?: string;
  code_verification_status?: string;
  platform_type?: string;
  status?: string;
};

export type GraphTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  quality_score?: { score?: string };
  rejected_reason?: string;
  components?: unknown[];
};

export async function exchangeEmbeddedSignupCode(code: string) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET não configurados para trocar o código do Embedded Signup.");
  }
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);
  const res = await fetch(url);
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string; code?: number };
  };
  if (!res.ok || !json.access_token) {
    throw new MetaApiError(translateMetaError(json.error ?? { message: "Falha na troca do código" }), {
      httpStatus: res.status,
      code: json.error?.code,
      providerMessage: json.error?.message,
    });
  }
  return { access_token: json.access_token, expires_in: json.expires_in };
}

export async function debugToken(inputToken: string) {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  const url = new URL(`${graphBase()}/debug_token`);
  url.searchParams.set("input_token", inputToken);
  url.searchParams.set("access_token", `${appId}|${appSecret}`);
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as {
    data?: {
      app_id?: string;
      is_valid?: boolean;
      expires_at?: number;
      scopes?: string[];
      granular_scopes?: { scope: string; target_ids?: string[] }[];
    };
  };
}

export async function listSharedWabas(accessToken: string) {
  return graphFetch<{ data: GraphWaba[] }>("/me/client_whatsapp_business_accounts", {
    accessToken,
    searchParams: { fields: "id,name,currency,timezone_id,message_template_namespace,account_review_status", limit: "100" },
  });
}

export async function listOwnedWabas(accessToken: string) {
  return graphFetch<{ data: GraphWaba[] }>("/me/whatsapp_business_accounts", {
    accessToken,
    searchParams: { fields: "id,name,currency,timezone_id,message_template_namespace,account_review_status", limit: "100" },
  });
}

export async function getBusiness(accessToken: string, businessId: string) {
  return graphFetch<{ id: string; name?: string }>(`/${businessId}`, {
    accessToken,
    searchParams: { fields: "id,name" },
  });
}

export async function listPhoneNumbers(accessToken: string, wabaId: string) {
  return graphFetch<{ data: GraphPhone[] }>(`/${wabaId}/phone_numbers`, {
    accessToken,
    searchParams: {
      fields:
        "id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status,code_verification_status,platform_type,status",
      limit: "100",
    },
  });
}

export async function listMessageTemplates(accessToken: string, wabaId: string) {
  return graphFetch<{ data: GraphTemplate[] }>(`/${wabaId}/message_templates`, {
    accessToken,
    searchParams: {
      fields: "id,name,language,status,category,quality_score,rejected_reason,components",
      limit: "100",
    },
  });
}

export async function subscribeWabaWebhooks(accessToken: string, wabaId: string) {
  return graphFetch(`/${wabaId}/subscribed_apps`, {
    accessToken,
    method: "POST",
  });
}

export async function registerPhoneNumber(accessToken: string, phoneNumberId: string, pin: string) {
  return graphFetch(`/${phoneNumberId}/register`, {
    accessToken,
    method: "POST",
    body: { messaging_product: "whatsapp", pin },
  });
}

export async function requestPhoneVerificationCode(
  accessToken: string,
  phoneNumberId: string,
  method: "SMS" | "VOICE" = "SMS",
) {
  return graphFetch(`/${phoneNumberId}/request_code`, {
    accessToken,
    method: "POST",
    body: { code_method: method, language: "pt_BR" },
  });
}

export async function verifyPhoneCode(accessToken: string, phoneNumberId: string, code: string) {
  return graphFetch(`/${phoneNumberId}/verify_code`, {
    accessToken,
    method: "POST",
    body: { code },
  });
}

export async function sendTemplateMessage(input: {
  accessToken: string;
  phoneNumberId: string;
  toE164: string;
  templateName: string;
  language: string;
  bodyParams?: string[];
}) {
  const components =
    input.bodyParams && input.bodyParams.length
      ? [
          {
            type: "body",
            parameters: input.bodyParams.map((text) => ({ type: "text", text })),
          },
        ]
      : undefined;

  return graphFetch<{ messages?: { id: string }[]; contacts?: { wa_id: string }[] }>(
    `/${input.phoneNumberId}/messages`,
    {
      accessToken: input.accessToken,
      method: "POST",
      body: {
        messaging_product: "whatsapp",
        to: input.toE164.replace(/\D/g, ""),
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.language },
          ...(components ? { components } : {}),
        },
      },
    },
  );
}

export async function sendTextMessage(input: {
  accessToken: string;
  phoneNumberId: string;
  toE164: string;
  body: string;
}) {
  return graphFetch<{ messages?: { id: string }[] }>(`/${input.phoneNumberId}/messages`, {
    accessToken: input.accessToken,
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      to: input.toE164.replace(/\D/g, ""),
      type: "text",
      text: { body: input.body },
    },
  });
}

export async function createMessageTemplate(
  accessToken: string,
  wabaId: string,
  payload: Record<string, unknown>,
) {
  return graphFetch<{ id: string; status?: string }>(`/${wabaId}/message_templates`, {
    accessToken,
    method: "POST",
    body: payload,
  });
}
