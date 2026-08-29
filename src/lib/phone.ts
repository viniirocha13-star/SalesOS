/** Normaliza telefone para E.164. Padrão Brasil (+55) quando o número é local. */
export function normalizePhone(input: string, defaultCountry = "55"): string {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (input.trim().startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.startsWith(defaultCountry) && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+${defaultCountry}${digits}`;
  }
  if (digits.length >= 12) {
    return `+${digits}`;
  }
  return `+${defaultCountry}${digits}`;
}

export function phonesMatch(a: string, b: string) {
  return normalizePhone(a) === normalizePhone(b);
}
