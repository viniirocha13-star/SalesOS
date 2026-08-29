import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";

export default async function CampanhasPage() {
  const campaigns = await prisma.campaign.findMany({
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Campanhas</h1>
      <p className="text-sm text-zinc-500">Cadeia obrigatória: Campaign → Lead → PreSale → Sale → Installation.</p>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="p-3">Campanha</th>
              <th className="p-3">Canal</th>
              <th className="p-3">Investimento</th>
              <th className="p-3">Leads</th>
            </tr>
          </thead>
          <tbody>
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
