import { describe, expect, it } from "vitest";
import { evaluateDiscovery } from "@/commercial/discovery";
import { classifyIntentSignals, classifyStrategy } from "@/commercial/intent";
import { isValidCpf, normalizeCpf, encryptCpf, decryptCpf, cpfPromptSafe } from "@/lib/cpf";
import { DevMockLlmProvider } from "@/integrations/llm/provider";

describe("Objection / intent — sinais, não roteiro", () => {
  it("caro com comparação não vira aceite perdido", () => {
    const s = classifyIntentSignals("Rapaz, tá caro. A outra aqui é 80.");
    expect(s.intent).toBe("OBJECTION");
    expect(["MEDIUM", "HIGH"]).toContain(s.buyingIntent);
  });

  it("se baixar eu fecho é HIGH e não EXPLICIT sem aceite", () => {
    const s = classifyIntentSignals("Se fizer por 80 eu fecho.");
    expect(s.buyingIntent).toBe("HIGH");
    expect(s.intent).toBe("NEGOTIATION");
  });

  it("estratégia muda com fatos — sem frase fixa", () => {
    const a = classifyStrategy({
      intent: "OBJECTION",
      buyingIntent: "MEDIUM",
      hasCurrentBill: false,
      mentionedCompetitor: false,
      hasAlternative: false,
    });
    const b = classifyStrategy({
      intent: "OBJECTION",
      buyingIntent: "MEDIUM",
      hasCurrentBill: true,
      mentionedCompetitor: true,
      hasAlternative: true,
    });
    expect(a).toBe("DISCOVER_CURRENT_PRICE");
    expect(b).toBe("CLARIFY_COMPARISON");
    expect(a).not.toBe(b);
  });
});

describe("SalesDiscoveryService", () => {
  it("informa o que falta sem ditar a frase", () => {
    const d = evaluateDiscovery({
      city: null,
      need: "Fibra",
      hasEligibleOffers: false,
      hasAcceptance: false,
      viabilityKnown: false,
    });
    expect(d.missing_critical_information).toContain("city");
    expect(d.can_search_offers).toBe(true);
    expect((d as { reply?: string }).reply).toBeUndefined();
  });
});

describe("PII CPF", () => {
  it("valida, criptografa e não devolve valor no prompt", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    const enc = encryptCpf("52998224725");
    expect(enc).not.toContain("52998224725");
    expect(decryptCpf(enc)).toBe("52998224725");
    expect(cpfPromptSafe(true, true)).toEqual({ cpf_collected: true, cpf_valid: true, cpf: undefined });
  });
});

describe("Mock do vendedor não tem if-caro-então-frase", () => {
  it("varia com contexto de tools e não promete 80", async () => {
    const llm = new DevMockLlmProvider();
    const first = await llm.complete({
      messages: [
        { role: "user", content: "tá caro" },
        {
          role: "tool",
          name: "get_objection_context",
          content: JSON.stringify({
            allowed_arguments: ["velocidade"],
            forbidden_claims: ["inventar desconto"],
            customer_context: {},
          }),
        },
      ],
      tools: [],
    });
    const second = await llm.complete({
      messages: [
        { role: "user", content: "tá caro" },
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
    });
    expect(first.content).not.toMatch(/80 reais de desconto|faço por 80/i);
    expect(second.content).not.toMatch(/quanto você paga atualmente/i);
    expect(first.content).not.toBe(second.content);
  });
});
