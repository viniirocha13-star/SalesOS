import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

export default async function CampanhasPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Campanhas"
        description="Cadeia: campanha → lead → pré-venda → venda → instalação."
      />
      <div className="surface overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Campanha</th>
              <th className="p-3">Canal</th>
              <th className="p-3">Investimento</th>
              <th className="p-3">Leads</th>
            </tr>
          </thead>
          <tbody>
            {!campaigns.length && (
              <tr>
                <td className="p-6 text-ink/50" colSpan={4}>
                  Nenhuma campanha cadastrada. Ads externos não entram neste marco.
                </td>
              </tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.channel}</td>
                <td className="p-3">{formatBRL(c.spendCents)}</td>
                <td className="p-3">{c._count.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
