import { normalizePhone } from "@/lib/phone";

export function isPhoneExcluded(phone: string, excludedPhones: Set<string>): boolean {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  return excludedPhones.has(normalized);
}

export function filterImportableContacts<T extends { phone: string }>(
  rows: T[],
  excludedPhones: Set<string>,
): { accepted: T[]; blocked: T[] } {
  const accepted: T[] = [];
  const blocked: T[] = [];
  for (const row of rows) {
    if (isPhoneExcluded(row.phone, excludedPhones)) blocked.push(row);
    else accepted.push(row);
  }
  return { accepted, blocked };
}

export function buildExclusionSet(phones: string[]): Set<string> {
  const set = new Set<string>();
  for (const p of phones) {
    const n = normalizePhone(p);
    if (n) set.add(n);
  }
  return set;
}
