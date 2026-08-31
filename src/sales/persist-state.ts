import { prisma } from "@/lib/prisma";
import { refreshConversationMemory } from "@/ai/memory";
import {
  compactSalesStateForPrompt,
  EMPTY_SALES_STATE,
  mergeSalesState,
  type SalesConversationState,
} from "@/sales/conversation-state";
import { applyExtractionToState } from "@/sales/semantic-extractor";
import { decideNextBestAction } from "@/sales/next-best-action";

export function stateFromMemory(raw: unknown): SalesConversationState {
  if (raw && typeof raw === "object") {
    return mergeSalesState(EMPTY_SALES_STATE, raw as Partial<SalesConversationState>);
  }
  return { ...EMPTY_SALES_STATE };
}

export async function loadSalesConversationState(conversationId: string): Promise<SalesConversationState> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { memory: true, lead: { include: { facts: true } } },
  });
  if (!conv) return { ...EMPTY_SALES_STATE };
  const fromJson = stateFromMemory(conv.memory?.commercialState);
  const facts = Object.fromEntries(conv.lead.facts.map((f) => [f.key, f.value]));
  return mergeSalesState(fromJson, {
    cidade: fromJson.cidade ?? conv.lead.city ?? (facts.city as string) ?? null,
    produto_interesse: fromJson.produto_interesse ?? conv.lead.productInterest ?? (facts.product_interest as string) ?? null,
    operadora_atual: fromJson.operadora_atual ?? (facts.current_provider as string) ?? null,
    current_bill: fromJson.current_bill ?? (facts.current_bill as string) ?? null,
    quantidade_linhas: fromJson.quantidade_linhas ?? (facts.household_size ? Number(facts.household_size) : null),
  });
}

export async function persistExtractedTurn(input: {
  conversationId: string;
  leadId: string;
  text: string;
  cityAvailable?: boolean | null;
  hasEligibleOffers?: boolean;
  hasAcceptance?: boolean;
  returningCustomer?: boolean;
}) {
  const previous = await loadSalesConversationState(input.conversationId);
  const merged = applyExtractionToState(previous, input.text);
  const decided = decideNextBestAction(merged, {
    cityAvailable: input.cityAvailable,
    hasEligibleOffers: input.hasEligibleOffers,
    hasAcceptance: input.hasAcceptance,
    customerAskedHuman: merged.handoff_required,
    returningCustomer: input.returningCustomer,
  });
  const next: SalesConversationState = {
    ...merged,
    ...decided,
    presented_greeting: previous.presented_greeting || merged.intent === "greeting" || merged.intent === "buy",
  };

  if (next.cidade) {
    await prisma.lead.update({ where: { id: input.leadId }, data: { city: next.cidade } });
  }
  if (next.produto_interesse) {
    await prisma.lead.update({
      where: { id: input.leadId },
      data: { productInterest: next.produto_interesse },
    });
  }

  const factPairs: Array<[string, string]> = [];
  if (next.cidade) factPairs.push(["city", next.cidade]);
  if (next.produto_interesse) factPairs.push(["product_interest", next.produto_interesse]);
  if (next.internet_interesse != null) factPairs.push(["internet_interesse", String(next.internet_interesse)]);
  if (next.portabilidade != null) factPairs.push(["portabilidade", String(next.portabilidade)]);
  if (next.operadora_atual) factPairs.push(["current_provider", next.operadora_atual]);
  if (next.quantidade_linhas != null) factPairs.push(["household_size", String(next.quantidade_linhas)]);
  if (next.perfil_cliente) factPairs.push(["perfil_cliente", next.perfil_cliente]);
  if (next.ddd_origem) factPairs.push(["ddd_origem", next.ddd_origem]);
  if (next.current_bill) factPairs.push(["current_bill", next.current_bill]);
  const competitor = input.text.match(/(?:outra|concorr\w*).{0,28}(?:é|e|de|por)\s*(?:r\$\s*)?(\d{2,4})/i);
  if (competitor) factPairs.push(["competitor_price", competitor[1]]);
  if (/netflix|globoplay|sky\+|prime/i.test(input.text)) factPairs.push(["usage_streaming", "HIGH"]);
  for (const [key, value] of factPairs) {
    await prisma.customerFact.upsert({
      where: { leadId_key: { leadId: input.leadId, key } },
      update: { value },
      create: { leadId: input.leadId, key, value, source: "conversation" },
    });
  }

  await prisma.conversationMemory.upsert({
    where: { conversationId: input.conversationId },
    create: {
      conversationId: input.conversationId,
      commercialState: compactSalesStateForPrompt(next) as object,
      customerFacts: {
        city: next.cidade,
        product_interest: next.produto_interesse,
        current_provider: next.operadora_atual,
      } as object,
    },
    update: {
      commercialState: compactSalesStateForPrompt(next) as object,
    },
  });
  await refreshConversationMemory(input.conversationId, {
    city: next.cidade,
    product_interest: next.produto_interesse,
    current_provider: next.operadora_atual,
    budget: next.current_bill ? `R$${next.current_bill}` : undefined,
  });
  return next;
}
