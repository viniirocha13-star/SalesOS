import { describe, expect, it } from "vitest";
import { classifyIntentSignals, classifyStrategy } from "@/commercial/intent";
import { evaluateDiscovery } from "@/commercial/discovery";
import { DevMockLlmProvider } from "@/integrations/llm/provider";
import { routeComplexity } from "@/commercial/complexity-router";
import { vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    complexityEscalation: {
      create: vi.fn(async (args: { data: unknown }) => args.data),
      count: vi.fn(async () => 0),
    },
  },
}));

vi.mock("@/lib/ai-models", () => ({
  aiModelFor: (task: string) => (task === "COMPLEX" ? "complex-model" : task === "UTILITY" ? "luna-model" : "sales-model"),
  complexRoutingEnabled: () => true,
  maxSolCallsPerConversation: () => 2,
}));

async function turn(llm: DevMockLlmProvider, user: string, tool?: object) {
  const first = await llm.complete({
    messages: [{ role: "user", content: user }],
    tools: [],
  });
  if (!first.toolCalls.length) return first;
  const payload = tool ?? defaultTool(first.toolCalls[0].name, user);
  return llm.complete({
    messages: [
      { role: "user", content: user },
      { role: "tool", name: first.toolCalls[0].name, content: JSON.stringify(payload) },
    ],
    tools: [],
  });
}

function defaultTool(name: string, user: string) {
  if (name === "search_eligible_offers") {
    return {
      offers: [{ name: "Fibra 500", speedMbps: 500, promotionalPriceCents: 9990, benefits: ["Wi-Fi 6"] }],
    };
  }
  if (name === "get_objection_context" || name === "register_objection") {
    return {
      category: "PRECO",
      allowed_arguments: ["velocidade cadastrada", "oferta alternativa elegível"],
      forbidden_claims: ["inventar desconto", "igualar preço sem oferta"],
      customer_context: user.includes("89") || user.includes("pago") ? { current_bill: "89" } : {},
      alternative_offers: [{ name: "Fibra 300", priceCents: 8990 }],
    };
  }
  if (name === "register_commercial_acceptance") return { accepted: true, offerId: "o1", stop_selling: true };
  if (name === "check_viability") {
    return { viability: { result: "VIAVEL", reliable: true, city: "Caucaia", details: { state: "AVAILABLE" } } };
  }
  return { ok: true };
}

describe("Fluxo conversacional principal (objeção)", () => {
  it("Caucaia → quanto → caro 80 → se fizer 80 eu fecho", async () => {
    const llm = new DevMockLlmProvider();
    const s1 = classifyIntentSignals("Quero internet em Caucaia.");
    expect(s1.intent).toBe("BUY");
    const r1 = await turn(llm, "Quero internet em Caucaia.");
    expect(r1.content).toMatch(/500|Mega|Caucaia|aprovad/i);

    const s2 = classifyIntentSignals("Quanto?");
    expect(s2.buyingIntent).toBe("MEDIUM");
    const r2 = await turn(llm, "Quanto?");
    expect(r2.content).toMatch(/R\$/);

    const s3 = classifyIntentSignals("Rapaz, tá caro. A outra aqui é 80.");
    expect(s3.intent).toBe("OBJECTION");
    expect(["MEDIUM", "HIGH"]).toContain(s3.buyingIntent);
    const r3 = await turn(llm, "Rapaz, tá caro. A outra aqui é 80.");
    expect(r3.content).not.toMatch(/faço por 80|fico 80|desconto de 80/i);
    expect(r3.content.toLowerCase()).not.toContain("entendo perfeitamente sua preocupação");

    const s4 = classifyIntentSignals("Se fizer por 80 eu fecho.");
    expect(s4.buyingIntent).toBe("HIGH");
    const r4 = await turn(llm, "Se fizer por 80 eu fecho.");
    expect(r4.content).not.toMatch(/por R\$ ?80(?!,)/i);
    expect(r4.content).toMatch(/aprovad|elegív|endereço|compar/i);
  });
});

describe("Memória de CustomerFacts", () => {
  it("não pergunta quanto paga se current_bill já existe", async () => {
    const llm = new DevMockLlmProvider();
    const reply = await llm.complete({
      messages: [
        { role: "user", content: "Esse aí ficou caro." },
        {
          role: "tool",
          name: "get_objection_context",
          content: JSON.stringify({
            allowed_arguments: ["valor vigente"],
            forbidden_claims: ["inventar desconto"],
            customer_context: { current_bill: "89" },
          }),
        },
      ],
      tools: [],
    });
    expect(reply.content).toMatch(/89/);
    expect(reply.content).not.toMatch(/quanto você paga atualmente/i);
  });
});

describe("Variação — mesma objeção, respostas diferentes", () => {
  it("três contextos geram textos distintos sem desconto inventado", async () => {
    const llm = new DevMockLlmProvider();
    const variants = await Promise.all([
      turn(llm, "Tá caro."),
      llm.complete({
        messages: [
          { role: "user", content: "Tá caro." },
          {
            role: "tool",
            name: "get_objection_context",
            content: JSON.stringify({
              allowed_arguments: ["velocidade"],
              forbidden_claims: ["inventar desconto"],
              customer_context: { current_bill: "89" },
            }),
          },
        ],
        tools: [],
      }),
      llm.complete({
        messages: [
          { role: "user", content: "A concorrência faz por 80." },
          {
            role: "tool",
            name: "get_objection_context",
            content: JSON.stringify({
              allowed_arguments: ["comparar produto"],
              forbidden_claims: ["falar mal da concorrência"],
              customer_context: {},
              competitor_price: "80",
            }),
          },
        ],
        tools: [],
      }),
    ]);
    const texts = variants.map((v) => v.content);
    expect(new Set(texts).size).toBeGreaterThan(1);
    for (const t of texts) {
      expect(t).not.toMatch(/faço por 80|te dou desconto/i);
    }
  });
});

describe("Aceite → coleta até o cliente enviar os dados", () => {
  it("depois do aceite o mock grava campo e pede o próximo", async () => {
    const llm = new DevMockLlmProvider();
    const collectingCtx = {
      role: "system" as const,
      content: `Contexto: {"SalesStage":"COMMERCIAL_ACCEPTANCE","CommercialAcceptance":{"id":"a1"}}`,
    };
    const first = await llm.complete({
      messages: [collectingCtx, { role: "user", content: "Maria Helena Costa" }],
      tools: [],
    });
    expect(first.toolCalls.map((c) => c.name)).toEqual(["save_customer_field", "get_required_customer_fields"]);
    expect(first.toolCalls[0].arguments).toEqual({ field: "FULL_NAME", value: "Maria Helena Costa" });
    const cpf = await llm.complete({
      messages: [collectingCtx, { role: "user", content: "529.982.247-25" }],
      tools: [],
    });
    expect(cpf.toolCalls[0].arguments).toMatchObject({ field: "CPF" });
    const done = await llm.complete({
      messages: [
        { role: "user", content: "61600-000" },
        { role: "tool", name: "get_required_customer_fields", content: JSON.stringify({ missing: [], remaining: 0 }) },
      ],
      tools: [],
    });
    expect(done.content).toMatch(/fila|operador/i);
  });
});

describe("Aceite → deixa de vender", () => {
  it("pode fazer vira EXPLICIT_ACCEPTANCE e mock inicia cadastro", async () => {
    const s = classifyIntentSignals("Tá bom, pode fazer.");
    expect(s.buyingIntent).toBe("EXPLICIT_ACCEPTANCE");
    const llm = new DevMockLlmProvider();
    const first = await llm.complete({ messages: [{ role: "user", content: "Tá bom, pode fazer." }], tools: [] });
    expect(first.toolCalls.map((c) => c.name)).toContain("register_commercial_acceptance");
    const reply = await llm.complete({
      messages: [
        { role: "user", content: "Tá bom, pode fazer." },
        { role: "tool", name: "register_commercial_acceptance", content: JSON.stringify({ accepted: true }) },
      ],
      tools: [],
    });
    expect(reply.content).toMatch(/cadastr/i);
    expect(reply.content).not.toMatch(/outra promoção|desconto/i);
  });
});

describe("Discovery não dita frase", () => {
  it("flags apenas", () => {
    const d = evaluateDiscovery({
      city: "Caucaia",
      need: "Fibra",
      hasEligibleOffers: true,
      hasAcceptance: false,
      viabilityKnown: false,
    });
    expect(d.can_present_offer).toBe(true);
    expect((d as { script?: string }).script).toBeUndefined();
  });
});

describe("Escalonamento complexo", () => {
  it("caso difícil sobe Terra → Sol", async () => {
    process.env.AI_COMPLEX_ENABLED = "true";
    process.env.AI_SALES_MODEL = "gpt-5.6-terra";
    process.env.AI_COMPLEX_MODEL = "gpt-5.6-sol";
    const { prisma } = await import("@/lib/prisma");
    const r = await routeComplexity("conv-hard", {
      consecutiveObjections: 3,
      contradictions: true,
      lowConfidence: false,
      salesRequestedEscalation: false,
      longNegotiation: true,
      complexComparison: true,
      inbound: "Tá caro e a outra é 80",
    });
    expect(r.purpose).toBe("COMPLEX");
    expect(r.reason).toMatch(/multiple_objections|contradictions/);
    expect(prisma.complexityEscalation.create).toHaveBeenCalled();
  });

  it("objeção isolada de preço não escala", async () => {
    const r = await routeComplexity("conv-simple", {
      consecutiveObjections: 1,
      contradictions: false,
      lowConfidence: false,
      salesRequestedEscalation: false,
      longNegotiation: false,
    });
    expect(r.purpose).toBe("SALES");
  });
});

describe("Estratégia é rótulo, não template", () => {
  it("HIGH com alternativa → SEARCH_ALTERNATIVE", () => {
    expect(
      classifyStrategy({
        intent: "NEGOTIATION",
        buyingIntent: "HIGH",
        hasCurrentBill: true,
        mentionedCompetitor: true,
        hasAlternative: true,
      }),
    ).toBe("SEARCH_ALTERNATIVE");
  });
});
