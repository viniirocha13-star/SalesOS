import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { LaunchForm } from "@/components/launch-form";
import { CopyButton } from "@/components/copy-data-button";

export default async function OperacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.preSale.findUnique({
    where: { id },
    include: {
      lead: { include: { consents: true, viabilityChecks: true, conversations: { include: { messages: true } } } },
      offer: true,
    },
  });
  if (!item) notFound();
  const copyText = [
    `Nome: ${item.lead.name}`,
    `Telefone: ${item.lead.phone}`,
    `Cidade: ${item.lead.city}`,
    `Endereço: ${item.address ?? item.lead.address}`,
    `Oferta: ${item.offer.name}`,
    `Preço: ${formatBRL(item.offer.promotionalPriceCents ?? item.offer.priceCents)}`,
    `Pedido interno: aguardando lançamento`,
  ].join("\n");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-white p-4 text-sm">
        <h1 className="text-xl font-semibold">Lançamento operacional</h1>
        <CopyButton text={copyText} />
        <p>
          <strong>Cliente:</strong> {item.lead.name}
        </p>
        <p>
          <strong>Telefone:</strong> {item.lead.phone}
        </p>
        <p>
          <strong>Endereço:</strong> {item.address ?? item.lead.address}
        </p>
        <p>
          <strong>Oferta aceita:</strong> {item.offer.name} · {formatBRL(item.offer.promotionalPriceCents ?? item.offer.priceCents)}
        </p>
        <p>
          <strong>Viabilidade:</strong> {item.viabilitySummary ?? item.lead.viabilityChecks[0]?.result ?? "—"}
        </p>
        <div>
          <strong>Resumo da IA</strong>
          <p className="mt-1 rounded bg-zinc-50 p-3">{item.aiSummary}</p>
        </div>
        <p>
          <strong>Consentimentos:</strong> {item.lead.consents.map((c) => `${c.type}:${c.granted ? "sim" : "não"}`).join(", ") || "—"}
        </p>
      </div>
      <LaunchForm preSaleId={item.id} />
    </div>
  );
}
