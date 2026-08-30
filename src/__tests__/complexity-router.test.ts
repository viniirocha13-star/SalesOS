import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    complexityEscalation: { create: vi.fn(async (args: { data: unknown }) => args.data) },
  },
}));

vi.mock("@/lib/ai-models", () => ({
  aiModelFor: (task: string) => (task === "COMPLEX" ? "complex-model" : "sales-model"),
}));

describe("ComplexityRouter", () => {
  it("não escala conversa simples", async () => {
    const { routeComplexity } = await import("@/commercial/complexity-router");
    const r = await routeComplexity("c1", {
      consecutiveObjections: 0,
      contradictions: false,
      lowConfidence: false,
      salesRequestedEscalation: false,
      longNegotiation: false,
    });
    expect(r.purpose).toBe("SALES");
    expect(r.reason).toBeNull();
  });

  it("caso difícil permanece no mesmo modelo (Luna)", async () => {
    const { routeComplexity } = await import("@/commercial/complexity-router");
    const { prisma } = await import("@/lib/prisma");
    const r = await routeComplexity("c1", {
      consecutiveObjections: 3,
      contradictions: true,
      lowConfidence: false,
      salesRequestedEscalation: false,
      longNegotiation: true,
    });
    expect(r.purpose).toBe("SALES");
    expect(r.reason).toMatch(/multiple_objections/);
    expect(prisma.complexityEscalation.create).toHaveBeenCalled();
    const payload = vi.mocked(prisma.complexityEscalation.create).mock.calls.at(-1)?.[0] as {
      data: { fromModel: string; toModel: string };
    };
    expect(payload.data.fromModel).toBe(payload.data.toModel);
  });
});
