import { describe, expect, it, vi, beforeEach } from "vitest";

const conversation = {
  id: "conv1",
  leadId: "lead1",
  aiEnabled: true,
  status: "IA_ATIVA",
  salesStage: "NEW",
  version: 1,
  channel: "SIMULATOR",
  lastInboundAt: new Date(),
  lead: { id: "lead1", city: "Caucaia", name: "Maria", productInterest: "Fibra", facts: [] },
  memory: { customerFacts: { city: "Caucaia" }, summary: null },
  messages: [{ direction: "INBOUND", body: "oi", createdAt: new Date() }],
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUniqueOrThrow: vi.fn(async () => conversation),
      update: vi.fn(async () => conversation),
    },
    message: {
      create: vi.fn(async ({ data }: { data: { body: string } }) => ({ id: "m-out", ...data })),
      update: vi.fn(async () => ({})),
    },
    aIExecution: { create: vi.fn(async () => ({})) },
    promptVersion: { findFirst: vi.fn(async () => null) },
    humanHandoff: { create: vi.fn(async () => ({})) },
    modelPrice: { findUnique: vi.fn(async () => null) },
    conversationMemory: { upsert: vi.fn(async () => ({})) },
    lead: { findUnique: vi.fn(async () => conversation.lead), update: vi.fn(async () => ({})) },
    objection: { count: vi.fn(async () => 0) },
    customerFact: { upsert: vi.fn(async () => ({})) },
    commercialDecision: { create: vi.fn(async () => ({})) },
  },
}));

vi.mock("@/workers/locks", () => ({
  withConversationLock: async (_id: string, fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/workers/queue", () => ({
  enqueueSendWhatsApp: vi.fn(async () => {}),
}));

vi.mock("@/ai/openai", async () => {
  const { DevMockLlmProvider } = await import("@/integrations/llm/provider");
  const mock = new DevMockLlmProvider();
  return {
    createSalesResponse: (input: { messages: { role: string; content: string }[]; tools: never[] }) =>
      mock.complete(input as never),
    estimateCostUsd: async () => 0,
  };
});

vi.mock("@/ai/memory", () => ({
  refreshConversationMemory: vi.fn(async () => ({})),
}));

vi.mock("@/ai/tools", () => ({
  SALES_TOOLS: [{ name: "search_eligible_offers", description: "", parameters: {} }],
  runTool: vi.fn(async () => ({
    offers: [{ name: "Fibra 500 Mega Residencial", speedMbps: 500, promotionalPriceCents: 9990, benefits: ["Wi-Fi 6"] }],
  })),
}));

vi.mock("@/events/bus", () => ({ emit: vi.fn(async () => {}) }));

vi.mock("@/commercial/context", () => ({
  buildCommercialContext: vi.fn(async () => ({
    payload: { SalesStage: "NEW", CustomerFacts: {}, ForbiddenClaims: [] },
    signals: { intent: "QUESTION", buyingIntent: "MEDIUM" },
    strategy: "COMPARE_OFFERS",
    ranking: { best_offer: { id: "o1" } },
    objection: null,
    discovery: { missing_critical_information: [] },
  })),
}));

vi.mock("@/commercial/complexity-router", () => ({
  routeComplexity: vi.fn(async () => ({ purpose: "SALES", reason: null })),
}));

describe("AISalesOrchestrator (LLM mock)", () => {
  beforeEach(() => {
    conversation.aiEnabled = true;
    conversation.version = 1;
  });

  it("gera outgoing e não responde se IA pausada", async () => {
    const { runSalesOrchestrator } = await import("@/ai/orchestrator");
    const ok = await runSalesOrchestrator({
      conversationId: "conv1",
      combinedInbound: "Tem quais planos em Caucaia?",
      persistInbound: false,
    });
    expect(ok.blocked).toBe(false);
    expect(ok.reply).toBeTruthy();

    conversation.aiEnabled = false;
    const paused = await runSalesOrchestrator({
      conversationId: "conv1",
      combinedInbound: "oi",
      persistInbound: false,
    });
    expect(paused.blocked).toBe(true);
    expect(paused.reply).toBeNull();
  });
});
