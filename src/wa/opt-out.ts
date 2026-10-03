export const OPT_OUT_KEYWORDS = ["SAIR", "PARAR", "CANCELAR", "STOP", "UNSUBSCRIBE", "CANCEL"];

export function isOptOutText(text?: string | null): boolean {
  if (!text) return false;
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (!normalized) return false;
  if (OPT_OUT_KEYWORDS.includes(normalized)) return true;
  // Frase curta começando com a palavra-chave
  const first = normalized.split(/\s+/)[0];
  return OPT_OUT_KEYWORDS.includes(first);
}
