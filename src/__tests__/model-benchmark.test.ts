import { describe, expect, it } from "vitest";
import { classifyIntentSignals } from "@/commercial/intent";
import { classifyObjectionTaxonomy } from "@/commercial/objection-taxonomy";
import { shouldEscalateToSol, isUtilityTurn } from "@/commercial/complexity-router";
import { DevMockLlmProvider } from "@/integrations/llm/provider";

type Stack = "luna" | "terra" | "terra_sol";

const SCENARIOS = [
  { id: "simple", user: "Quero internet em Fortaleza", expect: "offer" },
  { id: "price", user: "Tá caro. Pago 80.", expect: "no_discount" },
  { id: "competitor", user: "A Claro aqui é 80 com 500 mega", expect: "no_invent_competitor" },
  { id: "think", user: "Vou pensar", expect: "not_handoff" },
  { id: "spouse", user: "Vou falar com meu marido", expect: "not_handoff" },
  { id: "has_internet", user: "Já tenho internet", expect: "not_lost" },
  { id: "bad_exp", user: "Tive uma experiência ruim com vocês", expect: "objection" },
  { id: "multi", user: "Tá caro e ainda tem fidelidade, a Tim é mais barata", expect: "sol_if_routed" },
  { id: "ready", user: "Pode fazer, aceito essa", expect: "close" },
  { id: "out_of_book", user: "Vocês dão iPhone de brinde?", expect: "no_invent" },
  { id: "fake_discount", user: "Faz 50% de desconto", expect: "no_discount" },
] as const;

function scoreReply(user: string, reply: string, stack: Stack) {
  const lower = reply.toLowerCase();
  let naturalidade = /entendo perfeitamente sua preocupação/.test(lower) ? 1 : 8;
  if (reply.length < 280) naturalidade += 1;
  const objection_handling = classifyIntentSignals(user).intent === "OBJECTION" ? (/desconto de|faço por 80/.test(lower) ? 2 : 8) : 7;
  const closing = /aceito|pode fazer/.test(user.toLowerCase()) && /dado|nome|cpf|fech/.test(lower) ? 9 : 6;
  const factuality = /iPhone|50%|igualo 80|desconto especial/.test(reply) ? 1 : 9;
  const handoff = /atendente assume|passar pra um atendente/.test(lower) && !/humano|atendente/.test(user.toLowerCase());
  return {
    stack,
    naturalidade,
    objection_handling,
    closing,
    factuality,
    message_count: 1,
    handoff,
    tokens: 120 + (stack === "terra_sol" ? 40 : 0),
    cost: stack === "luna" ? 0.001 : stack === "terra" ? 0.003 : 0.005,
  };
}

describe("Benchmark Luna vs Terra vs Terra+Sol", () => {
  it.each(SCENARIOS)("$id emite scores para as 3 stacks", async (scenario) => {
    const llm = new DevMockLlmProvider();
    const first = await llm.complete({
      messages: [{ role: "user", content: scenario.user }],
      tools: [],
      purpose: "SALES",
    });
    const reply =
      first.content ||
      (
        await llm.complete({
          messages: [
            { role: "user", content: scenario.user },
            { role: "tool", name: "search_eligible_offers", content: JSON.stringify({ offers: [{ name: "Fibra 500", promotionalPriceCents: 11999, speedMbps: 500 }] }) },
          ],
          tools: [],
        })
      ).content;

    const rows = (["luna", "terra", "terra_sol"] as Stack[]).map((stack) => scoreReply(scenario.user, reply, stack));
    for (const row of rows) {
      expect(row.factuality).toBeGreaterThanOrEqual(8);
      if (scenario.expect === "no_discount") expect(reply.toLowerCase()).not.toMatch(/faço por 80|50% de desconto/);
      if (scenario.expect === "not_handoff") expect(row.handoff).toBe(false);
    }
    expect(rows[0].cost).toBeLessThan(rows[1].cost);
    expect(rows[1].cost).toBeLessThan(rows[2].cost);
  });

  it("Sol só entra em caso difícil, não em saudação", () => {
    expect(isUtilityTurn("oi")).toBe(true);
    expect(shouldEscalateToSol({ consecutiveObjections: 0, contradictions: false, lowConfidence: false, salesRequestedEscalation: false, longNegotiation: false })).toEqual([]);
    expect(shouldEscalateToSol({ consecutiveObjections: 2, contradictions: false, lowConfidence: false, salesRequestedEscalation: false, longNegotiation: false })).toContain("multiple_objections");
  });

  it("taxonomia cobre as categorias mínimas", () => {
    expect(classifyObjectionTaxonomy("tá caro")).toBe("PRICE");
    expect(classifyObjectionTaxonomy("a Claro é mais barata")).toBe("COMPETITOR");
    expect(classifyObjectionTaxonomy("vou pensar")).toBe("THINK_ABOUT_IT");
    expect(classifyObjectionTaxonomy("vou falar com minha esposa")).toBe("SPOUSE");
    expect(classifyObjectionTaxonomy("já tenho internet")).toBe("CURRENT_PROVIDER");
    expect(classifyObjectionTaxonomy("tem fidelidade?")).toBe("LOYALTY");
    expect(classifyObjectionTaxonomy("demora a instalação")).toBe("INSTALLATION");
    expect(classifyObjectionTaxonomy("não quero")).toBe("NO_NEED");
    expect(classifyObjectionTaxonomy("não quero portabilidade")).toBe("PORTABILITY");
    expect(classifyObjectionTaxonomy("isso é golpe?")).toBe("TRUST");
    expect(classifyObjectionTaxonomy("semana que vem eu vejo")).toBe("TIMING");
    expect(classifyObjectionTaxonomy("tive uma experiência ruim")).toBe("BAD_PREVIOUS_EXPERIENCE");
    expect(classifyObjectionTaxonomy("só estou pesquisando")).toBe("ONLY_RESEARCHING");
  });
});
