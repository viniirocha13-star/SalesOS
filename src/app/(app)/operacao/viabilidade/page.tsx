import { listQueuedBoxChecks } from "@/domain/viability";
import { PageHeader } from "@/components/page-header";
import { ResolveViabilityButton } from "@/components/resolve-viability-button";
import Link from "next/link";

export default async function ViabilidadeFilaPage() {
  const queue = await listQueuedBoxChecks();
  return (
    <div>
      <PageHeader
        kicker="Operação"
        title="Fila de viabilidade · caixa"
        description="Endereço geocodificado. Sem API oficial da Brisanet, o operador confere a caixa no sistema."
      />
      <div className="surface overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Endereço</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Lat / Lng</th>
              <th className="p-3">Fonte</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {!queue.length && (
              <tr>
                <td className="p-6 text-ink/50" colSpan={6}>
                  Nenhuma caixa pendente. Quando o cliente mandar o endereço, o card aparece aqui.
                </td>
              </tr>
            )}
            {queue.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.lead.name ?? item.lead.phone}</td>
                <td className="p-3">{item.address ?? item.lead.address ?? "—"}</td>
                <td className="p-3">{item.city ?? item.lead.city ?? "—"}</td>
                <td className="p-3 text-sm">
                  {item.latitude != null && item.longitude != null ? (
                    <a
                      className="text-teal hover:underline"
                      href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                    </a>
                  ) : (
                    "sem geocode"
                  )}
                </td>
                <td className="p-3 text-xs text-ink/50">{item.source}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <ResolveViabilityButton checkId={item.id} result="VIAVEL" label="Caixa viável" />
                    <ResolveViabilityButton checkId={item.id} result="NAO_VIAVEL" label="Sem caixa" />
                    <Link className="text-sm text-terracotta hover:underline" href={`/leads/${item.leadId}`}>
                      Lead
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
