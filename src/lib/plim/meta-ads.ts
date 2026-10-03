/**
 * Meta Marketing API — estrutura oficial de teste de conexão.
 * @see https://developers.facebook.com/docs/marketing-api/overview
 */
export async function testMetaAdsConnection(accessToken: string): Promise<{ ok: true; adAccountId: string }> {
  const url = new URL("https://graph.facebook.com/v21.0/me/adaccounts");
  url.searchParams.set("fields", "id,name,account_status");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url.toString(), { method: "GET" });
  const body = (await res.json()) as { data?: { id: string }[]; error?: { message: string } };
  if (!res.ok || body.error) {
    throw new Error(body.error?.message ?? `Meta Ads API respondeu ${res.status}`);
  }
  const first = body.data?.[0];
  if (!first?.id) throw new Error("Nenhuma conta de anúncios acessível com este token");
  return { ok: true, adAccountId: first.id };
}

export function resolveMetaAdsToken(envToken: string | undefined, dbToken: string | null | undefined): string | null {
  const fromEnv = envToken?.trim();
  if (fromEnv) return fromEnv;
  const fromDb = dbToken?.trim();
  return fromDb || null;
}
