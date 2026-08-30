import * as XLSX from "xlsx";
import Papa from "papaparse";
import { headerKey, fold } from "@/lib/text-norm";
import type { AcquisitionType } from "@prisma/client";

export type StreamingItem = { provider: string; plan: string | null };

export type ChannelRule = {
  raw: string;
  allows: string[];
  excludes: string[];
};

export type ParsedBookRow = {
  city: string | null;
  acquisitionType: AcquisitionType;
  acquisitionRaw: string | null;
  salesChannel: ChannelRule;
  category: string | null;
  categoryNormalized: string | null;
  planName: string | null;
  offerLevel: string | null;
  promotionalPriceCents: number | null;
  regularReferencePriceCents: number | null;
  futurePriceCents: number | null;
  promotionDurationMonths: number | null;
  pricingPeriodDescription: string | null;
  pricingOriginalText: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  commercialValidityRaw: string | null;
  includedProducts: string[];
  unlimitedApps: string[];
  launchCodes: string | null;
  includedStreaming: StreamingItem[];
  featuresOriginalText: string | null;
  installationIncluded: boolean | null;
  wifiIncluded: boolean | null;
  unlimitedCalls: boolean | null;
  unlimitedSms: boolean | null;
  roamingGb: number | null;
  deviceLoan: boolean | null;
  isCombo: boolean;
  speedMbps: number | null;
  mobileDataGb: number | null;
  fwaAllowanceGb: number | null;
  sourceRow: number;
  sourceSheet: string;
  sourceFile: string;
  originalText: string;
  errors: string[];
  warnings: string[];
  fingerprint: string;
};

const HEADER_MAP: Record<string, string> = {
  cidade: "city",
  city: "city",
  contratacao: "acquisition",
  contratacao_tipo: "acquisition",
  aquisicao: "acquisition",
  canal_de_venda: "channel",
  canal: "channel",
  categoria: "category",
  category: "category",
  oferta_plano: "plan",
  oferta: "plan",
  plano: "plan",
  nome: "plan",
  nivel: "level",
  preco_promocional: "promo_price",
  preco_promo: "promo_price",
  promo: "promo_price",
  preco_de: "regular_price",
  preco: "regular_price",
  preco_cheio: "regular_price",
  mensalidade_periodo: "period",
  mensalidade: "period",
  periodo: "period",
  vigencia_de_comercializacao: "validity",
  vigencia: "validity",
  produtos_inclusos: "products",
  apps_ilimitados: "apps",
  codigos_de_lancamento: "launch_codes",
  codigo_de_lancamento: "launch_codes",
  streaming_incluso: "streaming",
  recursos_detalhes: "features",
  recursos: "features",
  detalhes: "features",
};

export function parseWorkbook(fileName: string, buffer: Buffer): ParsedBookRow[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsvSheet(fileName, buffer.toString("utf8"), "CSV");
  }
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const rows: ParsedBookRow[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    rows.push(...parseCsvSheet(fileName, csv, sheetName));
  }
  return rows;
}

function parseCsvSheet(fileName: string, csv: string, sheetName: string): ParsedBookRow[] {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: "greedy" });
  if (!parsed.meta.fields?.length) return [];
  const col = mapHeaders(parsed.meta.fields);
  if (!col.plan && !col.category) return [];
  const out: ParsedBookRow[] = [];
  parsed.data.forEach((raw, idx) => {
    const get = (key: string) => {
      const header = col[key];
      if (!header) return "";
      return String(raw[header] ?? "").trim();
    };
    const planName = get("plan") || null;
    const categoryRaw = get("category");
    const features = get("features");
    const period = get("period");
    const promoText = get("promo_price");
    const regularText = get("regular_price");
    const validityRaw = get("validity");
    const channelRaw = get("channel");
    const acquisitionRaw = get("acquisition");
    const streamingRaw = get("streaming");
    const category = normalizeCategory(categoryRaw || inferCategory(planName, sheetName, features));
    const speedMbps = parseSpeedMbps(planName, category);
    const mobileDataGb = parseMobileGb(planName, category);
    const fwaAllowanceGb = parseFwaGb(planName, category, features);
    const promo = parseMoney(promoText);
    const regular = parseMoney(regularText);
    const periodInfo = parsePricingPeriod(period, regular);
    const validity = parseValidity(validityRaw);
    const streaming = parseStreaming(streamingRaw);
    const apps = splitList(get("apps"));
    const products = splitList(get("products"));
    const featureFacts = parseFeatures(features);
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!planName) errors.push("plano_sem_nome");
    if (promo == null && regular == null) errors.push("preco_ausente");
    if (validityRaw && !validity.from && !validity.until) errors.push("vigencia_invalida");
    if (validity.from && validity.until && validity.from > validity.until) errors.push("data_invertida");
    if (!category) warnings.push("categoria_desconhecida");
    if (channelRaw && !parseChannel(channelRaw).allows.length && !parseChannel(channelRaw).excludes.length) {
      warnings.push("canal_desconhecido");
    }
    if (period && periodInfo.futurePriceCents == null && /apos|após|depois/i.test(period)) {
      warnings.push("mensalidade_dificil_de_interpretar");
    }
    if (streamingRaw && fold(streamingRaw) !== "nao" && streaming.length === 0) {
      warnings.push("streaming_inconsistente");
    }
    const isCombo = Boolean(
      category === "COMBO" ||
        (speedMbps && mobileDataGb) ||
        (planName && /\+/.test(planName) && /\d+\s*(mega|giga|gb)/i.test(planName) && /\d+\s*gb/i.test(planName)),
    );
    const row: ParsedBookRow = {
      city: get("city") || null,
      acquisitionType: parseAcquisition(acquisitionRaw),
      acquisitionRaw: acquisitionRaw || null,
      salesChannel: parseChannel(channelRaw),
      category: categoryRaw || category,
      categoryNormalized: category,
      planName,
      offerLevel: get("level") || null,
      promotionalPriceCents: promo,
      regularReferencePriceCents: regular,
      futurePriceCents: periodInfo.futurePriceCents ?? regular,
      promotionDurationMonths: periodInfo.months,
      pricingPeriodDescription: period || null,
      pricingOriginalText: [promoText, regularText, period].filter(Boolean).join(" | ") || null,
      validFrom: validity.from,
      validUntil: validity.until,
      commercialValidityRaw: validityRaw || null,
      includedProducts: products,
      unlimitedApps: apps,
      launchCodes: get("launch_codes") || null,
      includedStreaming: streaming,
      featuresOriginalText: features || null,
      installationIncluded: featureFacts.installationIncluded,
      wifiIncluded: featureFacts.wifiIncluded,
      unlimitedCalls: featureFacts.unlimitedCalls,
      unlimitedSms: featureFacts.unlimitedSms,
      roamingGb: featureFacts.roamingGb,
      deviceLoan: featureFacts.deviceLoan,
      isCombo,
      speedMbps,
      mobileDataGb,
      fwaAllowanceGb,
      sourceRow: idx + 2,
      sourceSheet: sheetName,
      sourceFile: fileName,
      originalText: JSON.stringify(raw),
      errors,
      warnings,
      fingerprint: "",
    };
    row.fingerprint = fingerprint(row);
    out.push(row);
  });
  markExactDuplicates(out);
  return out;
}

function mapHeaders(fields: string[]) {
  const col: Record<string, string> = {};
  for (const field of fields) {
    const mapped = HEADER_MAP[headerKey(field)];
    if (mapped && !col[mapped]) col[mapped] = field;
  }
  return col;
}

export function normalizeCategory(raw?: string | null) {
  if (!raw) return null;
  const t = fold(raw);
  if (/combo/.test(t)) return "COMBO";
  if (/fwa|fixo sem fio|wireless/.test(t)) return "FWA";
  if (/movel|celular|chip|linha/.test(t)) return "MOVEL";
  if (/fibra|internet fixa|banda/.test(t)) return "FIBRA";
  return t.replace(/\s+/g, "_").toUpperCase();
}

function inferCategory(plan: string | null, sheet: string, features: string) {
  const blob = fold(`${plan ?? ""} ${sheet} ${features}`);
  if (/combo|\+/.test(blob) && /gb/.test(blob) && /mega|giga/.test(blob)) return "COMBO";
  if (/fwa|comodato|sem cabos/.test(blob)) return "FWA";
  if (/chip|movel|whatsapp|gb/.test(blob) && !/mega|giga/.test(blob)) return "MOVEL";
  if (/mega|giga|fibra/.test(blob)) return "FIBRA";
  return sheet;
}

export function parseAcquisition(raw?: string | null): AcquisitionType {
  const t = fold(raw ?? "");
  if (/fideliz|retenc|base/.test(t)) return "RETENTION";
  if (/migrac/.test(t)) return "MIGRATION";
  if (/aquisic|novo|new/.test(t)) return "NEW_CUSTOMER";
  if (!t) return "NEW_CUSTOMER";
  return "OTHER";
}

export function parseChannel(raw?: string | null): ChannelRule {
  const t = fold(raw ?? "todos");
  const excludes: string[] = [];
  if (/exceto digital|exceto o digital/.test(t)) excludes.push("DIGITAL", "WHATSAPP", "SIMULATOR");
  if (/exceto parceiro/.test(t)) excludes.push("PARCEIROS");
  if (/exceto loja/.test(t)) excludes.push("LOJA");
  return { raw: raw ?? "todos", allows: excludes.length ? [] : ["TODOS"], excludes };
}

export function conversationChannelToken(channel: string) {
  if (channel === "WHATSAPP" || channel === "SIMULATOR") return "DIGITAL";
  return fold(channel).toUpperCase();
}

export function channelAllows(rule: Pick<ChannelRule, "allows" | "excludes">, conversationChannel: string) {
  const token = conversationChannelToken(conversationChannel);
  if (rule.excludes.some((x) => x === token || x === conversationChannel)) return false;
  return true;
}

export function parseMoney(value?: string | null) {
  if (!value) return null;
  const t = String(value).replace(/[R$\s]/gi, "").trim();
  if (!t || fold(t) === "nao") return null;
  const n = t.includes(",")
    ? Number(t.replace(/\./g, "").replace(",", "."))
    : Number(t.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function parseSpeedMbps(plan?: string | null, category?: string | null) {
  if (category === "MOVEL" || category === "FWA") {
    if (category === "FWA") return null;
    if (category === "MOVEL" && !/mega|giga/i.test(plan ?? "")) return null;
  }
  const text = plan ?? "";
  const giga = text.match(/(\d+(?:[.,]\d+)?)\s*giga/i);
  if (giga) return Math.round(Number(giga[1].replace(",", ".")) * 1000);
  const mega = text.match(/(\d+)\s*mega/i);
  if (mega) return Number(mega[1]);
  return null;
}

export function parseMobileGb(plan?: string | null, category?: string | null) {
  if (category === "FIBRA" || category === "FWA") {
    if (category === "FIBRA" && !/\+/.test(plan ?? "")) return null;
  }
  const plus = (plan ?? "").match(/\+\s*(\d+)\s*gb/i);
  if (plus) return Number(plus[1]);
  if (category === "MOVEL") {
    const m = (plan ?? "").match(/(\d+)\s*gb/i);
    if (m) return Number(m[1]);
  }
  return null;
}

export function parseFwaGb(plan?: string | null, category?: string | null, features?: string) {
  if (category !== "FWA" && !/fwa/i.test(`${plan} ${features}`)) return null;
  const tb = (plan ?? "").match(/(\d+(?:[.,]\d+)?)\s*tb/i);
  if (tb) return Math.round(Number(tb[1].replace(",", ".")) * 1024);
  const gb = (plan ?? "").match(/(\d+)\s*gb/i);
  if (gb) return Number(gb[1]);
  return null;
}

export function parseValidity(raw?: string | null) {
  if (!raw) return { from: null as Date | null, until: null as Date | null };
  const dates = [...String(raw).matchAll(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/g)].map((m) => {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return new Date(Date.UTC(y, mo - 1, d));
  });
  return { from: dates[0] ?? null, until: dates[1] ?? dates[0] ?? null };
}

export function parsePricingPeriod(period?: string | null, fallbackRegular?: number | null) {
  if (!period) return { months: null as number | null, futurePriceCents: fallbackRegular ?? null };
  const months = period.match(/(\d+)\s*mes/i);
  const future = period.match(/ap[oó]s\s*(?:r\$\s*)?(\d+[.,]\d+)/i);
  return {
    months: months ? Number(months[1]) : null,
    futurePriceCents: future ? parseMoney(future[1]) : fallbackRegular ?? null,
  };
}

export function parseStreaming(raw?: string | null): StreamingItem[] {
  if (!raw || fold(raw) === "nao" || fold(raw) === "n/a" || fold(raw) === "-") return [];
  const extras: StreamingItem[] = [];
  if (/amazon\s*prime/i.test(raw) && !/^amazon/i.test(raw.trim())) {
    extras.push({ provider: "Amazon Prime", plan: null });
  }
  const parts = raw
    .split(/[;|/]/)
    .map((part) => part.replace(/\s+com\s+amazon\s*prime/i, "").trim())
    .filter(Boolean);
  const items = parts.map((part) => {
    const m = part.match(/^(Netflix|Globoplay|Sky\+|Amazon(?:\s*Prime)?|Disney(?:\+)?|HBO|Max|YouTube)/i);
    const provider = m ? normalizeStreamingProvider(m[1]) : part.split(/\s+/).slice(0, 2).join(" ");
    const plan = m ? part.slice(m[0].length).trim() || null : part;
    return { provider, plan: plan && fold(plan) !== fold(provider) ? plan : plan };
  });
  return [...items, ...extras.filter((e) => !items.some((i) => i.provider === e.provider))];
}

function normalizeStreamingProvider(name: string) {
  const t = fold(name);
  if (t.startsWith("netflix")) return "Netflix";
  if (t.startsWith("globo")) return "Globoplay";
  if (t.startsWith("sky")) return "Sky+";
  if (t.startsWith("amazon") || t.includes("prime")) return "Amazon Prime";
  if (t.startsWith("disney")) return "Disney+";
  return name;
}

function splitList(raw?: string | null) {
  if (!raw || fold(raw) === "nao") return [];
  return raw
    .split(/[,;|/]/)
    .map((s) => s.trim())
    .filter((s) => s && fold(s) !== "nao");
}

export function parseFeatures(raw?: string | null) {
  const t = fold(raw ?? "");
  const roaming = t.match(/(\d+(?:[.,]\d+)?)\s*gb de roaming|roaming.*?(\d+(?:[.,]\d+)?)\s*gb/);
  return {
    installationIncluded: /instalacao/.test(t) && /incluso/.test(t) ? true : /instalacao/.test(t) ? true : null,
    wifiIncluded: /wi-?fi/.test(t) ? true : null,
    unlimitedCalls: /ligacoes?/.test(t) && /ilimitad/.test(t) ? true : null,
    unlimitedSms: /\bsms\b/.test(t) && /ilimitad/.test(t) ? true : null,
    roamingGb: roaming ? Number((roaming[1] || roaming[2]).replace(",", ".")) : null,
    deviceLoan: /comodato/.test(t) ? true : null,
  };
}

export function fingerprint(row: Pick<
  ParsedBookRow,
  | "planName"
  | "promotionalPriceCents"
  | "pricingPeriodDescription"
  | "includedStreaming"
  | "salesChannel"
  | "acquisitionType"
  | "validFrom"
  | "validUntil"
  | "offerLevel"
  | "city"
  | "categoryNormalized"
>) {
  return [
    fold(row.planName ?? ""),
    row.promotionalPriceCents ?? "",
    fold(row.pricingPeriodDescription ?? ""),
    JSON.stringify(row.includedStreaming),
    fold(row.salesChannel.raw),
    row.acquisitionType,
    row.validFrom?.toISOString() ?? "",
    row.validUntil?.toISOString() ?? "",
    fold(row.offerLevel ?? ""),
    fold(row.city ?? ""),
    row.categoryNormalized ?? "",
  ].join("|");
}

function markExactDuplicates(rows: ParsedBookRow[]) {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const n = seen.get(row.fingerprint) ?? 0;
    if (n > 0) row.warnings.push("duplicidade_exata");
    seen.set(row.fingerprint, n + 1);
  }
}

export const FIELD_CLASSIFICATION = {
  promotional_price: "CUSTOMER_VISIBLE",
  regular_reference_price: "CUSTOMER_VISIBLE",
  speed_mbps: "CUSTOMER_VISIBLE",
  included_streaming: "CUSTOMER_VISIBLE",
  unlimited_apps: "CUSTOMER_VISIBLE",
  included_products: "CUSTOMER_VISIBLE",
  features: "CUSTOMER_VISIBLE",
  commercial_validity: "ELIGIBILITY_RULE",
  sales_channel: "ELIGIBILITY_RULE",
  acquisition_type: "ELIGIBILITY_RULE",
  offer_level: "ELIGIBILITY_RULE",
  launch_codes: "INTERNAL_OPERATIONAL",
} as const;
