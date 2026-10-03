import type { PlimAutopilot, PlimOffer } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueOffer } from "@/lib/repositories/plim/queue";
import { ensureDefaultTemplate } from "@/lib/repositories/plim/templates";
import { formatBrPrice, renderMessageTemplate } from "@/lib/plim/template-render";

export function offerMatchesPilot(offer: PlimOffer, pilot: PlimAutopilot): boolean {
  if (pilot.marketplace && offer.marketplace !== pilot.marketplace) return false;

  const price = offer.currentPrice != null ? Number(offer.currentPrice) : null;
  if (pilot.minPrice != null && (price == null || price < Number(pilot.minPrice))) return false;
  if (pilot.maxPrice != null && (price == null || price > Number(pilot.maxPrice))) return false;

  if (pilot.minDiscount != null) {
    const d = offer.discountPercent ?? 0;
    if (d < pilot.minDiscount) return false;
  }

  const q = pilot.searchQuery?.trim().toLowerCase();
  if (q) {
    const hay = [
      offer.productName,
      offer.description ?? "",
      offer.category ?? "",
      ...(offer.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.every((t) => hay.includes(t))) return false;
  }

  return true;
}

export async function runAutopilotAgainstCapturedOffers(tenantId: string, pilotId: string) {
  const pilot = await prisma.plimAutopilot.findFirst({ where: { id: pilotId, tenantId } });
  if (!pilot) return { ok: false as const, error: "Piloto não encontrado." };
  if (pilot.status !== "ATIVO") return { ok: false as const, error: "Piloto não está ativo." };

  const destIds = pilot.destinationGroupIds ?? [];
  if (!destIds.length) {
    return { ok: false as const, error: "Configure pelo menos um grupo destino (IDs) no piloto." };
  }

  const groups = await prisma.plimGroup.findMany({
    where: { tenantId, id: { in: destIds }, active: true, groupRole: "DESTINO" },
  });
  if (!groups.length) {
    return { ok: false as const, error: "Nenhum grupo destino válido encontrado para este piloto." };
  }

  const offers = await prisma.plimOffer.findMany({
    where: {
      tenantId,
      status: { in: ["NOVA", "EM_ANALISE", "APROVADA", "PROGRAMADA"] },
    },
    orderBy: { capturedAt: "desc" },
    take: 300,
  });

  const matched = offers.filter((o) => offerMatchesPilot(o, pilot));
  const cap = pilot.dailyQuantity && pilot.dailyQuantity > 0 ? pilot.dailyQuantity : matched.length;
  const selected = matched.slice(0, cap);

  if (!selected.length) {
    return {
      ok: true as const,
      matched: 0,
      enqueued: 0,
      message: "Nenhuma oferta capturada no banco compatível com marketplace, preço, desconto ou busca deste piloto.",
    };
  }

  const template =
    (pilot.templateId
      ? await prisma.plimMessageTemplate.findFirst({ where: { id: pilot.templateId, tenantId } })
      : null) ?? (await ensureDefaultTemplate(tenantId));

  let enqueued = 0;
  for (const offer of selected) {
    const destUrl = offer.affiliateLink ?? offer.originalLink ?? "";
    const message = renderMessageTemplate(template.body, {
      produto: `${offer.messageEmoji ?? ""} ${offer.productName}`.trim(),
      preco_anterior: formatBrPrice(offer.originalPrice ? Number(offer.originalPrice) : null),
      preco: formatBrPrice(offer.currentPrice ? Number(offer.currentPrice) : null),
      cupom: offer.coupon ? `Cupom: ${offer.coupon}` : "",
      link: destUrl,
    });

    for (const group of groups) {
      await enqueueOffer(tenantId, {
        offerId: offer.id,
        groupId: group.id,
        messageBody: message,
        imageUrl: offer.imageUrl ?? undefined,
        campaign: `piloto:${pilot.id}`,
      });
      enqueued++;
    }

    await prisma.plimOffer.updateMany({
      where: { id: offer.id, tenantId },
      data: { status: "NA_FILA", editorMessage: message },
    });
  }

  return {
    ok: true as const,
    matched: matched.length,
    enqueued,
    message: `${selected.length} oferta(s) compatível(is); ${enqueued} item(ns) na fila.`,
  };
}
