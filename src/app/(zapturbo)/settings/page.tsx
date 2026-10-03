import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const ctx = await requireOrg("org.view");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organization.id } });

  const links = [
    { href: "/settings/meta", title: "Integração Meta / WhatsApp", desc: "Conectar, sincronizar e diagnosticar" },
    { href: "/settings/team", title: "Equipe", desc: "Convites e perfis de acesso" },
    { href: "/settings/billing", title: "Faturamento", desc: "Plano do SaaS (separado dos custos Meta)" },
    { href: "/settings/diagnostics", title: "Diagnóstico", desc: "Verificações automáticas da operação" },
    { href: "/onboarding", title: "Passo a passo", desc: "Checklist completo para quem adquiriu" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        kicker="ZapTurbo"
        title="Configurações"
        description={`${org.name} · papel ${ctx.role}`}
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold">Empresa</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Nome</dt>
            <dd className="font-medium">{org.name}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Slug</dt>
            <dd className="font-medium">{org.slug}</dd>
          </div>
          <div>
            <dt className="text-slate-400">CNPJ</dt>
            <dd className="font-medium">{org.taxId ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Site</dt>
            <dd className="font-medium">{org.website ?? "—"}</dd>
          </div>
        </dl>
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">{l.title}</p>
                <p className="text-sm text-slate-500">{l.desc}</p>
              </div>
              <span className="text-[#148a52]">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
