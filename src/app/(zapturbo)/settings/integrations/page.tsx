import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";

export default async function IntegrationsSettingsPage() {
  await requireOrg("meta.view");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        kicker="ZapTurbo"
        title="Integrações"
        description="WhatsApp Business Platform é o canal principal. n8n e CRMs entram só como automações opcionais."
      />
      <Link
        href="/settings/meta"
        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:bg-slate-50"
      >
        <div>
          <p className="font-semibold">Meta / WhatsApp Cloud API</p>
          <p className="text-sm text-slate-500">Conectar empresa, WABA e número</p>
        </div>
        <span className="text-[#148a52]">Abrir →</span>
      </Link>
    </div>
  );
}
