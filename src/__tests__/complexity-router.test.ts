import { describe, expect, it, vi, beforeEach } from "vitest";

const prisma = {
  complexityEscalation: {
    create: vi.fn(async (args: { data: unknown }) => args.data),
    count: vi.fn(async () => 0),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma }));

describe("ComplexityRouter Terra → Sol", () => {
  beforeEach(() => {
    prisma.complexityEscalation.create.mockClear();
    prisma.complexityEscalation.count.mockResolvedValue(0);
    process.env.AI_COMPLEX_ENABLED = "true";
    process.env.AI_SALES_MODEL = "gpt-5.6-terra";
    process.env.AI_COMPLEX_MODEL = "gpt-5.6-sol";
    process.env.MAX_SOL_CALLS_PER_CONVERSATION = "2";
  });

  it("não escala conversa simples", async () => {
    const { routeComplexity } = await import("@/commercial/complexity-router");
    const r = await routeComplexity("c1", {
      consecutiveObjections: 0,
      contradictions: false,
      lowConfidence: false,
      salesRequestedEscalation: false,
      longNegotiation: false,
      inbound: "Quero internet em Fortaleza",
    });
    expect(r.purpose).toBe("SALES");
    expect(r.solUsed).toBe(false);
    expect(r.model).toBe("gpt-5.6-terra");
  });

  it("não usa Sol em saudação ou CEP", async () => {
    const { routeComplexity } = await import("@/commercial/complexity-router");
    const r = await routeComplexity("c1", {
      consecutiveObjections: 3,
      contradictions: true,
      lowConfidence: true,
      salesRequestedEscalation: false,
      longNegotiation: true,
      inbound: "oi",
    });
    expect(r.purpose).toBe("SALES");
    expect(r.solUsed).toBe(false);
  });

  it("escala Terra → Sol em múltiplas objeções", async () => {
    const { routeComplexity } = await import("@/commercial/complexity-router");
    const r = await routeComplexity("c1", {
      consecutiveObjections: 2,
      contradictions: false,
      lowConfidence: false,
      salesRequestedEscalation: false,
      longNegotiation: false,
      inbound: "Tá caro e ainda tem fidelidade",
    });
    expect(r.purpose).toBe("COMPLEX");
    expect(r.solUsed).toBe(true);
    expect(r.model).toBe("gpt-5.6-sol");
    expect(r.reason).toMatch(/multiple_objections/);
    expect(prisma.complexityEscalation.create).toHaveBeenCalled();
  });

  it("respeita o teto de chamadas do Sol", async () => {
    prisma.complexityEscalation.count.mockResolvedValue(2);
    const { routeComplexity } = await import("@/commercial/complexity-router");
    const r = await routeComplexity("c1", {
      consecutiveObjections: 3,
      contradictions: false,
      lowConfidence: false,
      salesRequestedEscalation: false,
      longNegotiation: true,
      inbound: "Tá caro demais",
    });
    expect(r.purpose).toBe("SALES");
    expect(r.reason).toMatch(/sol_cap_reached/);
    expect(r.solUsed).toBe(false);
  });
});
