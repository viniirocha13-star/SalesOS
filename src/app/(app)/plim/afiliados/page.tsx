import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { affiliateAdapters } from "@/lib/affiliates";
import { listGroups } from "@/lib/repositories/plim/groups";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { ConversorTestForm } from "@/components/plim/conversor-test-form";

const ENV_HINT: Record<string, string> = {
  SHOPEE: "PLIM_SHOPEE_AFFILIATE_ID",
  MERCADO_LIVRE: "PLIM_MERCADOLIVRE_TRACKING_ID",
  AMAZON: "PLIM_AMAZON_TAG",
  MAGALU: "PLIM_MAGALU_PARTNER_ID",
  ALIEXPRESS: "PLIM_ALIEXPRESS_TRACKING_ID",
  SHEIN: "PLIM_SHEIN_AFFILIATE_ID",
  AWIN: "PLIM_AWIN_PUBLISHER_ID",
};

export default async function PlimAfiliadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const groups = await listGroups(ctx.tenantId);

  return (
    <PlimSection title="Afiliados" description="Status por marketplace e teste de conversão.">
      <div className="grid gap-3 md:grid-cols-2">
        {affiliateAdapters.map((a) => {
          const env = ENV_HINT[a.marketplace];
          const configured = env ? Boolean(process.env[env]?.trim()) : false;
          return (
            <div key={a.marketplace} className={plimCardClass()}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{a.marketplace}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${configured ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
                  {configured ? "Configurado" : "Não configurado"}
                </span>
              </div>
              {env && <p className="mt-1 text-xs text-slate-500">Env: {env}</p>}
              <p className="text-xs text-slate-500">Sub-id: {a.supportsSubId() ? "suportado" : "não"}</p>
            </div>
          );
        })}
      </div>
      <div className={plimCardClass()}>
        <h2 className="font-medium">Testar conversão</h2>
        <ConversorTestForm groups={groups.map((g) => ({ id: g.id, name: g.name, externalId: g.externalId }))} />
      </div>
    </PlimSection>
  );
}
