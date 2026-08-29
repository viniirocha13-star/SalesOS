const PHONE = /(\+?55)?\s*\d{2}\s*9?\d{4}[-.\s]?\d{4}/g;
const CPF = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g;

export function maskPhone(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return "***";
  return `${digits.slice(0, 4)}****${digits.slice(-2)}`;
}

export function maskCpf(value?: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 11) return "***";
  return `***${digits.slice(-2)}`;
}

export function maskForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(PHONE, "[telefone]").replace(CPF, "[cpf]");
  }
  if (Array.isArray(value)) return value.map(maskForLog);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.toLowerCase();
      if (["phone", "telefone", "cpf", "documentcpf", "email", "address", "endereco"].includes(key)) {
        out[k] = "[redacted]";
      } else {
        out[k] = maskForLog(v);
      }
    }
    return out;
  }
  return value;
}
