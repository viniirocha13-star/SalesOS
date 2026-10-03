import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const ctx = await requireOrg("analytics.view");
  const orgId = ctx.organization.id;
  const [sent, delivered, read, failed, optedOut] = await Promise.all([
    prisma.waMessage.count({
      where: { organizationId: orgId, direction: "OUTBOUND", status: { in: ["SENT", "DELIVERED", "READ"] } },
    }),
    prisma.waMessage.count({ where: { organizationId: orgId, status: { in: ["DELIVERED", "READ"] } } }),
    prisma.waMessage.count({ where: { organizationId: orgId, status: "READ" } }),
    prisma.waMessage.count({ where: { organizationId: orgId, status: "FAILED" } }),
    prisma.contact.count({ where: { organizationId: orgId, status: "OPTED_OUT" } }),
  ]);

  const cards = [
    { label: "Enviadas", value: sent },
    { label: "Entregues", value: delivered },
    { label: "Lidas", value: read },
    { label: "Falhas", value: failed },
    { label: "Opt-outs", value: optedOut },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        kicker="ZapTurbo"
        title="Relatórios"
        description="Visão consolidada de envios, entrega, leitura, falhas e opt-outs."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[12px] text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{c.value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Para o resumo do dia com gráfico e conexão Meta, abra o{" "}
        <Link href="/visao-geral" className="font-medium text-[#148a52] hover:underline">
          Dashboard
        </Link>
        .
      </p>
    </div>
  );
}
