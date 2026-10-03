import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { PlimMarketplace } from "@prisma/client";
import { fold } from "@/lib/text-norm";

export type CommissionImportRow = {
  orderId: string | null;
  productName: string | null;
  amount: number;
  commission: number;
  subId: string | null;
  occurredAt: Date;
  marketplace: PlimMarketplace;
  groupExternalId: string | null;
  rowNumber: number;
  errors: string[];
};

const MARKETPLACE_ALIASES: Record<string, PlimMarketplace> = {
  shopee: "SHOPEE",
  mercadolivre: "MERCADO_LIVRE",
  mercado_livre: "MERCADO_LIVRE",
  ml: "MERCADO_LIVRE",
  amazon: "AMAZON",
  magalu: "MAGALU",
  magazine: "MAGALU",
  aliexpress: "ALIEXPRESS",
  shein: "SHEIN",
  awin: "AWIN",
};

const HEADER_HINTS: Record<string, string[]> = {
  orderId: ["pedido", "order", "orderid", "idpedido", "numero"],
  productName: ["produto", "product", "item", "titulo"],
  amount: ["valor", "amount", "total", "valortotal", "preco"],
  commission: ["comissao", "commission", "valorcomissao", "receita"],
  subId: ["subid", "sub", "sub_id", "tracking", "tag"],
  occurredAt: ["data", "date", "occurred", "datapedido", "criado"],
  marketplace: ["marketplace", "loja", "plataforma", "canal"],
  groupExternalId: ["grupo", "group", "groupid", "externalid", "subgrupo", "whatsapp"],
};

function pickField(row: Record<string, string>, field: keyof typeof HEADER_HINTS): string | undefined {
  const keys = Object.keys(row);
  const folded = new Map(keys.map((k) => [fold(k), k]));
  for (const hint of HEADER_HINTS[field]) {
    const key = folded.get(hint);
    if (key && row[key]?.trim()) return row[key].trim();
  }
  for (const key of keys) {
    const f = fold(key);
    if (HEADER_HINTS[field].some((h) => f.includes(h))) {
      const v = row[key]?.trim();
      if (v) return v;
    }
  }
  return undefined;
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const normalized = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const br = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return new Date(`${y}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}T12:00:00`);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMarketplace(raw: string | undefined, fallback: PlimMarketplace): PlimMarketplace {
  if (!raw?.trim()) return fallback;
  const key = fold(raw).replace(/[^a-z0-9_]/g, "");
  return MARKETPLACE_ALIASES[key] ?? fallback;
}

export function parseCommissionSheetRows(
  rows: Record<string, string>[],
  defaultMarketplace: PlimMarketplace = "OUTRO",
): CommissionImportRow[] {
  return rows.map((row, idx) => {
    const errors: string[] = [];
    const amount = parseNumber(pickField(row, "amount"));
    const commission = parseNumber(pickField(row, "commission"));
    if (amount === null) errors.push("Valor do pedido ausente ou inválido");
    if (commission === null) errors.push("Comissão ausente ou inválida");
    const occurredAt = parseDate(pickField(row, "occurredAt")) ?? new Date();
    return {
      orderId: pickField(row, "orderId") ?? null,
      productName: pickField(row, "productName") ?? null,
      amount: amount ?? 0,
      commission: commission ?? 0,
      subId: pickField(row, "subId") ?? null,
      occurredAt,
      marketplace: parseMarketplace(pickField(row, "marketplace"), defaultMarketplace),
      groupExternalId: pickField(row, "groupExternalId") ?? null,
      rowNumber: idx + 2,
      errors,
    };
  });
}

export function parseCommissionFile(
  fileName: string,
  buffer: Buffer,
  defaultMarketplace?: PlimMarketplace,
): CommissionImportRow[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = buffer.toString("utf8");
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    return parseCommissionSheetRows(parsed.data, defaultMarketplace);
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    return parseCommissionSheetRows(rows, defaultMarketplace);
  }
  throw new Error("Formato não suportado. Use CSV ou XLSX.");
}
