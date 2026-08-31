import { prisma } from "@/lib/prisma";
import { selectOffers } from "@/offer-engine/select";
import { classifyIntentSignals } from "@/commercial/intent";

export type ObjectionContext = {
  category: string;
  severity: "low" | "medium" | "high";
  customer_context: Record<string, unknown>;
  current_offer: unknown;
  alternative_offers: unknown[];
  eligible_alternatives: unknown[];
  allowed_arguments: string[];
  forbidden_claims: string[];
  commercial_goal: string;
  previous_attempts: string[];
  competitor_price?: string | null;
  buying_interest: string;
};

export async function getObjectionContext(conversationId: string, objectionType?: string): Promise<ObjectionContext> {
  const conv = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      lead: { include: { facts: true, objections: { orderBy: { createdAt: "desc" }, take: 8 } } },
      memory: true,
    },
  });
  const last = conv.lead.objections[0];
  const { classifyObjectionTaxonomy, taxonomyToPrisma, severityFor } = await import("@/commercial/objection-taxonomy");
  const taxonomy = classifyObjectionTaxonomy(objectionType || last?.text || last?.category || "");
  const category = taxonomy;
  const prismaCategory = taxonomyToPrisma(objectionType || last?.category || taxonomy);
  const playbook = await prisma.objectionPlaybook.findFirst({
    where: { category: prismaCategory, active: true },
  });
  const ranking = await selectOffers({
    city: conv.lead.city,
    need: conv.lead.productInterest,
  });
  const facts = Object.fromEntries(conv.lead.facts.map((f) => [f.key, f.value]));
  const competitor = extractCompetitorPrice(last?.text ?? "") || (facts.competitor_price as string | undefined);
  const lastInbound = await prisma.message.findFirst({
    where: { conversationId, direction: "INBOUND" },
    orderBy: { createdAt: "desc" },
  });
  const signals = classifyIntentSignals(lastInbound?.body ?? last?.text ?? "");

  return {
    category,
    customer_context: {
      city: conv.lead.city,
      current_bill: facts.current_bill ?? facts.budget,
      product_interest: conv.lead.productInterest,
      stage: conv.salesStage,
    },
    current_offer: ranking.best_offer
      ? {
          id: ranking.best_offer.id,
          name: ranking.best_offer.name,
          priceCents: ranking.best_offer.promotionalPriceCents ?? ranking.best_offer.priceCents,
        }
      : null,
    severity: severityFor(taxonomy, signals.buyingIntent),
    alternative_offers: [ranking.alternative_offer, ranking.upsell, ranking.cross_sell]
      .filter(Boolean)
      .map((o) => ({ id: o!.id, name: o!.name, priceCents: o!.promotionalPriceCents ?? o!.priceCents })),
    eligible_alternatives: [ranking.alternative_offer, ranking.upsell]
      .filter(Boolean)
      .map((o) => ({ id: o!.id, name: o!.name, priceCents: o!.promotionalPriceCents ?? o!.priceCents })),
    allowed_arguments: [
      playbook?.argument,
      "velocidade cadastrada na oferta",
      "benefícios listados na oferta aprovada",
      "estabilidade somente se houver base aprovada",
      "oferta alternativa elegível do motor",
    ].filter(Boolean) as string[],
    forbidden_claims: [
      "inventar desconto",
      "falar mal da concorrência",
      "inventar benefício",
      "prometer condição inexistente",
      "igualar preço sem oferta aprovada",
    ],
    commercial_goal: signals.buyingIntent === "HIGH" || signals.buyingIntent === "EXPLICIT_ACCEPTANCE" ? "close_or_alternative" : "understand_and_keep",
    previous_attempts: conv.lead.objections.map((o) => o.category),
    competitor_price: competitor ?? null,
    buying_interest: signals.buyingIntent,
  };
}

function extractCompetitorPrice(text: string) {
  const m = text.match(/r?\$?\s*(\d{2,4})/i);
  return m ? m[1] : null;
}
