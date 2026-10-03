import Papa from "papaparse";
import * as XLSX from "xlsx";
import { normalizePhone } from "@/lib/phone";
import { fold } from "@/lib/text-norm";

export type ContactImportRow = {
  name: string | null;
  phone: string;
  source: string | null;
  importedAt: Date;
  groupExternalId: string | null;
  consent: boolean;
  rowNumber: number;
  errors: string[];
};

function pickContactField(row: Record<string, string>, hints: string[]): string | undefined {
  const keys = Object.keys(row);
  const folded = new Map(keys.map((k) => [fold(k), k]));
  for (const hint of hints) {
    const key = folded.get(hint);
    if (key && row[key]?.trim()) return row[key].trim();
  }
  for (const key of keys) {
    const f = fold(key);
    if (hints.some((h) => f.includes(h))) {
      const v = row[key]?.trim();
      if (v) return v;
    }
  }
  return undefined;
}

function parseContactRow(row: Record<string, string>, idx: number, sourceLabel: string): ContactImportRow {
  const errors: string[] = [];
  const rawPhone =
    pickContactField(row, ["telefone", "phone", "celular", "whatsapp", "mobile"]) ??
    pickContactField(row, ["tel"]);
  const phone = rawPhone ? normalizePhone(rawPhone) : "";
  if (!phone) errors.push("Telefone ausente ou inválido");
  const name = pickContactField(row, ["nome", "name", "contato"]) ?? null;
  const consentRaw = pickContactField(row, ["consentimento", "consent", "optin", "lgpd"]);
  const consent = consentRaw ? /^(sim|yes|true|1|s)$/i.test(consentRaw) : false;
  const groupExternalId = pickContactField(row, ["grupo", "group", "groupid", "externalid"]) ?? null;
  return {
    name,
    phone,
    source: sourceLabel,
    importedAt: new Date(),
    groupExternalId,
    consent,
    rowNumber: idx + 2,
    errors,
  };
}

export function parseContactCsv(buffer: Buffer, sourceLabel = "importação CSV"): ContactImportRow[] {
  const text = buffer.toString("utf8");
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return parsed.data.map((row, i) => parseContactRow(row, i, sourceLabel));
}

export function parseContactXlsx(buffer: Buffer, sourceLabel = "importação XLSX"): ContactImportRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  return rows.map((row, i) => parseContactRow(row, i, sourceLabel));
}

export function parseContactTxt(buffer: Buffer, sourceLabel = "importação TXT"): ContactImportRow[] {
  const lines = buffer
    .toString("utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, i) => {
    const parts = line.split(/[;,|\t]/).map((p) => p.trim());
    const phone = normalizePhone(parts.find((p) => /\d{8,}/.test(p)) ?? parts[0] ?? "");
    const name = parts.length > 1 ? parts[0] : null;
    const errors: string[] = [];
    if (!phone) errors.push("Telefone ausente ou inválido");
    return {
      name,
      phone,
      source: sourceLabel,
      importedAt: new Date(),
      groupExternalId: null,
      consent: false,
      rowNumber: i + 1,
      errors,
    };
  });
}

/** Parse minimal VCF (FN + TEL). */
export function parseContactVcf(buffer: Buffer, sourceLabel = "importação VCF"): ContactImportRow[] {
  const text = buffer.toString("utf8");
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  return cards.map((card, i) => {
    const fn = card.match(/^FN:(.+)$/im)?.[1]?.trim() ?? null;
    const tel =
      card.match(/^TEL[^:]*:(.+)$/im)?.[1]?.trim() ??
      card.match(/^item\d+\.TEL[^:]*:(.+)$/im)?.[1]?.trim();
    const phone = tel ? normalizePhone(tel) : "";
    const errors: string[] = [];
    if (!phone) errors.push("Telefone ausente ou inválido");
    return {
      name: fn,
      phone,
      source: sourceLabel,
      importedAt: new Date(),
      groupExternalId: null,
      consent: false,
      rowNumber: i + 1,
      errors,
    };
  });
}

export function parseContactFile(fileName: string, buffer: Buffer): ContactImportRow[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return parseContactCsv(buffer);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseContactXlsx(buffer);
  if (lower.endsWith(".txt")) return parseContactTxt(buffer);
  if (lower.endsWith(".vcf")) return parseContactVcf(buffer);
  throw new Error("Formato não suportado. Use CSV, XLSX, TXT ou VCF.");
}
