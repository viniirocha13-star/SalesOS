import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SupervisorPage() {
  const [leads, objections, lost, presented] = await Promise.all([
    prisma.lead.count(),
    prisma.objection.groupBy({ by: ["category"], _count: true }),
    prisma.lead.count({ where: { status: "PERDIDO" } }),
    prisma.lead.count({ where: { status: { in: ["OFERTA_APRESENTADA", "NEGOCIANDO", "PERDIDO"] } } }),
  ]);

  const cityLost = await prisma.lead.groupBy({
    by: ["city"],
    where: { status: "PERDIDO" },
    _count: true,
  });
  const cityAll = await prisma.lead.groupBy({ by: ["city"], _count: true });

  const insights: string[] = [];
  for (const row of cityLost) {
    const total = cityAll.find((c) => c.city === row.city)?._count ?? 0;
    if (total >= 3 && row.city) {
      const pct = Math.round((row._count / total) * 100);
      insights.push(`${pct}% dos leads de ${row.city} foram perdidos (${row._count}/${total}).`);
    }
  }
  const price = objections.find((o) => o.category === "PRECO");
  if (price && objections.reduce((a, b) => a + b._count, 0) >= 2) {
    insights.push(`Objeção de PREÇO é a mais registrada (${price._count} ocorrências).`);
  }
  if (presented >= 3) {
    insights.push(`Há ${presented} leads que viram oferta ou perda após oferta — acompanhe abandono pós-preço.`);
  }
  if (!insights.length) {
    insights.push("Ainda não há volume mínimo para conclusões automáticas. O Supervisor IA não inventa tendência com amostra pequena.");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Supervisor IA</h1>
      <p className="text-sm text-zinc-500">Insights objetivos a partir do funil. Sem conclusão sem quantidade mínima.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Leads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{leads}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Perdidos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{lost}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Objeções</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{objections.reduce((a, b) => a + b._count, 0)}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.map((i) => (
            <p key={i} className="rounded-lg bg-amber-50 p-3 text-sm">
              {i}
            </p>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Objeções por categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {objections.map((o) => (
            <div key={o.category} className="flex justify-between">
              <span>{o.category}</span>
              <span>{o._count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
