import { prisma } from "@/lib/prisma";

export default async function MapaPage() {
  const points = await prisma.lead.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: { id: true, name: true, city: true, status: true, latitude: true, longitude: true },
  });

  const minLat = -8.2;
  const maxLat = -2.8;
  const minLng = -41.5;
  const maxLng = -34.8;

  function xy(lat: number, lng: number) {
    return {
      x: ((lng - minLng) / (maxLng - minLng)) * 100,
      y: ((maxLat - lat) / (maxLat - minLat)) * 100,
    };
  }

  const color = (status: string) => {
    if (status === "INSTALADO") return "#16a34a";
    if (status === "PERDIDO") return "#71717a";
    if (status.includes("LANCAMENTO") || status === "CADASTRO_APROVADO") return "#ea580c";
    return "#0f766e";
  };

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-4xl">Mapa de demanda</h1>
      <p className="mt-2 text-sm text-ink/50">
        Localização aproximada para inteligência de cobertura. Sem exposição de endereço completo no mapa. Fase 3 aprofundará camadas de calor.
      </p>
      <div className="relative h-[480px] overflow-hidden rounded-3xl border border-[#e0d5c6] bg-[#efe6d9]">
        <div className="absolute inset-6 rounded-lg border border-dashed border-emerald-700/30" />
        {points.map((p) => {
          const pos = xy(p.latitude!, p.longitude!);
          return (
            <div
              key={p.id}
              title={`${p.city} · ${p.status}`}
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, background: color(p.status) }}
            />
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-zinc-600">
        <span>Verde-escuro: lead</span>
        <span>Laranja: venda/fila</span>
        <span>Verde: instalado</span>
      </div>
    </div>
  );
}
