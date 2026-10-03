export class AffiliateNotConfiguredError extends Error {
  constructor(marketplace: string) {
    super(`Afiliado ${marketplace} não configurado. Defina as credenciais no ambiente.`);
    this.name = "AffiliateNotConfiguredError";
  }
}

export function requireEnv(name: string, marketplace: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new AffiliateNotConfiguredError(marketplace);
  return v;
}
