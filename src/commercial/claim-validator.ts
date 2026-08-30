import { fold } from "@/lib/text-norm";
import type { CustomerOffer } from "@/offer-engine/customer-view";

export type ClaimIssue = { claim: string; reason: string };

export function validateCommercialClaims(reply: string, offers: CustomerOffer[]): { ok: boolean; issues: ClaimIssue[] } {
  const issues: ClaimIssue[] = [];
  const text = reply ?? "";
  if (/c[oó]digo de lan[cç]amento|SKU-|FIB\d{3}-/i.test(text)) {
    issues.push({ claim: "launch_code", reason: "código operacional não pode ir ao cliente" });
  }

  const prices = [...text.matchAll(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+,\d{2})/gi)].map((m) => parseCents(m[1]));
  const allowedPrices = new Set(
    offers.flatMap((o) => [o.promotionalPriceCents, o.regularPriceCents, o.futurePriceCents]).filter((n): n is number => n != null),
  );
  for (const cents of prices) {
    if (cents && allowedPrices.size && ![...allowedPrices].some((p) => Math.abs(p - cents) <= 1)) {
      issues.push({ claim: `price:${cents}`, reason: "preço não está nas ofertas elegíveis" });
    }
  }

  const speeds = [...text.matchAll(/(\d+)\s*Mega/gi)].map((m) => Number(m[1]));
  const giga = /1\s*Giga/i.test(text);
  const allowedSpeeds = new Set(offers.map((o) => o.speedMbps).filter((n): n is number => n != null));
  for (const s of speeds) {
    if (allowedSpeeds.size && !allowedSpeeds.has(s)) {
      issues.push({ claim: `speed:${s}`, reason: "velocidade ausente das ofertas elegíveis" });
    }
  }
  if (giga && allowedSpeeds.size && !allowedSpeeds.has(1000)) {
    issues.push({ claim: "speed:1000", reason: "1 Giga não está nas ofertas elegíveis" });
  }

  for (const brand of ["Netflix", "Globoplay", "Amazon Prime", "Sky+"] as const) {
    if (new RegExp(brand.replace("+", "\\+"), "i").test(text)) {
      const ok = offers.some((o) => o.includedStreaming.some((s) => fold(s.provider).includes(fold(brand))));
      if (!ok) issues.push({ claim: brand, reason: "streaming não está no book das ofertas apresentadas" });
    }
  }

  if (/whatsapp ilimitado/i.test(text)) {
    const ok = offers.some((o) => o.unlimitedApps.some((a) => fold(a).includes("whatsapp")));
    if (!ok) issues.push({ claim: "WhatsApp", reason: "app ilimitado não cadastrado" });
  }

  if (/consumo zero|n[aã]o gasta dados/i.test(text) && /whatsapp|facebook|waze/i.test(text)) {
    issues.push({ claim: "zero_data", reason: "não afirmar consumo zero se a regra não estiver explícita" });
  }

  if (/ideal para \d+ pessoas|perfeito para fam[ií]lia/i.test(text)) {
    issues.push({ claim: "household_rule", reason: "relação velocidade/uso só com knowledge aprovada" });
  }

  return { ok: issues.length === 0, issues };
}

function parseCents(raw: string) {
  const n = raw.includes(",")
    ? Number(raw.replace(/\./g, "").replace(",", "."))
    : Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
