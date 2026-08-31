import type { ViabilityInput, ViabilityOutput } from "./provider";

export function officialViabilityConfigured() {
  return Boolean(process.env.BRISANET_VIABILITY_URL && process.env.BRISANET_VIABILITY_TOKEN);
}

export function mapOfficialPayload(payload: unknown): Pick<ViabilityOutput, "result" | "reliable"> | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const nested = (row.coverage ?? row.data ?? row.result) as Record<string, unknown> | string | undefined;
  const raw =
    row.viable ??
    row.available ??
    row.isViable ??
    (typeof nested === "object" ? nested?.status ?? nested?.viable ?? nested?.available : nested);
  if (raw == null) return null;
  const text = String(raw).toLowerCase();
  if (["true", "1", "viavel", "available", "ok", "yes", "sim"].includes(text)) {
    return { result: "VIAVEL", reliable: true };
  }
  if (["false", "0", "nao_viavel", "unavailable", "no", "nao", "não"].includes(text)) {
    return { result: "NAO_VIAVEL", reliable: true };
  }
  if (["indeterminado", "unknown", "pending"].includes(text)) {
    return { result: "INDETERMINADO", reliable: false };
  }
  return null;
}

export async function checkOfficialViability(input: ViabilityInput): Promise<ViabilityOutput> {
  const url = process.env.BRISANET_VIABILITY_URL;
  const token = process.env.BRISANET_VIABILITY_TOKEN;
  if (!url || !token) {
    return {
      result: "INDETERMINADO",
      source: "official_not_configured",
      reliable: false,
      details: { reason: "api_oficial_ausente" },
    };
  }
  const method = (process.env.BRISANET_VIABILITY_METHOD ?? "POST").toUpperCase();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const body = {
    address: input.address,
    zipCode: input.zipCode,
    city: input.city,
    neighborhood: input.neighborhood,
    latitude: input.latitude,
    longitude: input.longitude,
  };
  const target =
    method === "GET"
      ? `${url}${url.includes("?") ? "&" : "?"}${new URLSearchParams(
          Object.fromEntries(Object.entries(body).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])),
        ).toString()}`
      : url;
  const res = await fetch(target, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    return {
      result: "INDETERMINADO",
      source: "official_api_failed",
      reliable: false,
      details: { http: res.status, queued: true },
    };
  }
  const payload = await res.json().catch(() => null);
  const mapped = mapOfficialPayload(payload);
  if (!mapped) {
    return {
      result: "INDETERMINADO",
      source: "official_api_unmapped",
      reliable: false,
      details: { queued: true, reason: "resposta_nao_mapeada" },
    };
  }
  return {
    result: mapped.result,
    reliable: mapped.reliable,
    source: "brisanet_official",
    details: { official: true, queued: false },
  };
}
