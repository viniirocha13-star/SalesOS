export function formatBRL(cents?: number | null) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateTime(value?: Date | string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function waitMinutes(from: Date) {
  return Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000));
}
