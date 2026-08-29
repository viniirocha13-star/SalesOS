import { prisma } from "@/lib/prisma";
import { selectOffers } from "@/offer-engine/select";
import { evaluateDiscovery } from "@/commercial/discovery";
import { classifyIntentSignals, classifyStrategy } from "@/commercial/intent";
import { getObjectionContext } from "@/commercial/objection-engine";
import { cpfPromptSafe } from "@/lib/cpf";

export async function buildCommercialContext(conversationId: string, latestInbound: string) {
  const conv = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      lead: {
        include: {
          facts: true,
          objections: { orderBy: { createdAt: "desc" }, take: 6 },
          viabilityChecks: { orderBy: { createdAt: "desc" }, take: 1 },
          acceptances: { orderBy: { createdAt: "desc" }, take: 1 },
          preSales: { orderBy: { createdAt: "desc" }, take: 1 },
          customer: true,
        },
      },
      memory: true,
      messages: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });

  const facts = Object.fromEntries(conv.lead.facts.map((f) => [f.key, f.value]));
  const ranking = await selectOffers({
    city: conv.lead.city,
    need: conv.lead.productInterest ?? (facts.product_interest as string | undefined),
  });
  const signals = classifyIntentSignals(latestInbound);
  const objection = /caro|puxado|concorr|pensar|fidel|instala/.test(latestInbound.toLowerCase())
    ? await getObjectionContext(conversationId)
    : null;
  const discovery = evaluateDiscovery({
    city: conv.lead.city,
    need: conv.lead.productInterest,
    address: conv.lead.address,
    currentBill: (facts.current_bill as string) ?? null,
    hasEligibleOffers: Boolean(ranking.best_offer),
    hasAcceptance: conv.lead.acceptances.length > 0,
    viabilityKnown: Boolean(conv.lead.viabilityChecks[0]),
  });
  const strategy = classifyStrategy({
    intent: signals.intent,
    buyingIntent: signals.buyingIntent,
    hasCurrentBill: Boolean(facts.current_bill || facts.budget),
    mentionedCompetitor: /concorr|outra aqui|vivo|claro|tim|\b80\b/.test(latestInbound.toLowerCase()),
    hasAlternative: Boolean(ranking.alternative_offer),
  });

  const cpfCollected = Boolean(conv.lead.customer?.documentCpf);
  const payload = {
    SalesStage: conv.salesStage,
    CustomerFacts: {
      name: conv.lead.name,
      city: conv.lead.city,
      neighborhood: conv.lead.neighborhood,
      product_interest: conv.lead.productInterest,
      current_provider: facts.current_provider,
      current_bill: facts.current_bill ?? facts.budget,
      ...facts,
      ...cpfPromptSafe(cpfCollected, cpfCollected),
    },
    ConversationSummary: conv.memory?.summary ?? null,
    RecentMessages: [...conv.messages].reverse().map((m) => ({ actor: m.actor, body: m.body })),
    Viability: conv.lead.viabilityChecks[0]
      ? { result: conv.lead.viabilityChecks[0].result, source: conv.lead.viabilityChecks[0].source }
      : { result: "UNKNOWN" },
    EligibleOffers: {
      best_offer: slimOffer(ranking.best_offer),
      alternative_offer: slimOffer(ranking.alternative_offer),
      cross_sell: slimOffer(ranking.cross_sell),
    },
    PresentedOffers: conv.memory?.offersPresented ?? [],
    CurrentOffer: slimOffer(ranking.best_offer),
    Objections: objection,
    BuyingIntent: signals.buyingIntent,
    Intent: signals.intent,
    CommercialAcceptance: conv.lead.acceptances[0]
      ? { id: conv.lead.acceptances[0].id, offerId: conv.lead.acceptances[0].offerId, at: conv.lead.acceptances[0].createdAt }
      : null,
    AllowedArguments: objection?.allowed_arguments ?? [],
    ForbiddenClaims: objection?.forbidden_claims ?? [
      "inventar desconto",
      "inventar cobertura",
      "inventar preço",
    ],
    PendingInformation: discovery.missing_critical_information,
    Discovery: discovery,
    StrategyHint: strategy,
    PreSale: conv.lead.preSales[0]
      ? { id: conv.lead.preSales[0].id, status: conv.lead.preSales[0].status }
      : null,
  };

  return { payload, signals, strategy, ranking, discovery, objection, conv };
}

function slimOffer(offer: { id: string; name: string; speedMbps: number | null; promotionalPriceCents: number | null; priceCents: number | null; benefits: string[] } | null) {
  if (!offer) return null;
  return {
    id: offer.id,
    name: offer.name,
    speedMbps: offer.speedMbps,
    priceCents: offer.promotionalPriceCents ?? offer.priceCents,
    benefits: offer.benefits.slice(0, 4),
  };
}
