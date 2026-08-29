export type LlmMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; name?: string };

export type LlmTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LlmToolCall = { id: string; name: string; arguments: Record<string, unknown> };

export type LlmResult = {
  content: string;
  toolCalls: LlmToolCall[];
  model: string;
};

export interface LlmProvider {
  readonly name: string;
  complete(input: { messages: LlmMessage[]; tools: LlmTool[] }): Promise<LlmResult>;
}

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = "openai";

  async complete(input: { messages: LlmMessage[]; tools: LlmTool[] }): Promise<LlmResult> {
    const key = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    if (!key) throw new Error("OPENAI_API_KEY ausente");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: input.messages.map((m) => ({
          role: m.role === "tool" ? "tool" : m.role,
          content: m.content,
          name: m.name,
        })),
        tools: input.tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      }),
    });
    if (!res.ok) {
      throw new Error("Falha na API OpenAI");
    }
    const json = (await res.json()) as {
      choices: {
        message: {
          content?: string;
          tool_calls?: { id: string; function: { name: string; arguments: string } }[];
        };
      }[];
    };
    const msg = json.choices[0]?.message;
    return {
      model,
      content: msg?.content ?? "",
      toolCalls: (msg?.tool_calls ?? []).map((c) => ({
        id: c.id,
        name: c.function.name,
        arguments: JSON.parse(c.function.arguments || "{}"),
      })),
    };
  }
}

export function getLlmProvider(): LlmProvider {
  if (process.env.OPENAI_API_KEY) return new OpenAiLlmProvider();
  return new DevMockLlmProvider();
}

/** Heurística determinística para desenvolvimento local. Identificada no simulador. */
export class DevMockLlmProvider implements LlmProvider {
  readonly name = "dev_mock_llm";

  async complete(input: { messages: LlmMessage[]; tools: LlmTool[] }): Promise<LlmResult> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const lower = lastUser.toLowerCase();
    const hasToolResults = input.messages.some((m) => m.role === "tool");

    if (hasToolResults) {
      const lastTool = [...input.messages].reverse().find((m) => m.role === "tool");
      return {
        model: this.name,
        toolCalls: [],
        content: composeFromTools(lastUser, lastTool?.content ?? ""),
      };
    }

    const calls: LlmToolCall[] = [];
    if (/humano|atendente|pessoa|reclam/.test(lower)) {
      calls.push({ id: "t1", name: "request_human", arguments: { reason: "CLIENTE_SOLICITOU" } });
    } else if (/não quero|nao quero|caro|depois|pensar|concorrente/.test(lower)) {
      calls.push({ id: "t1", name: "register_objection", arguments: { text: lastUser } });
      calls.push({ id: "t2", name: "get_faq", arguments: { query: lastUser } });
    } else if (/viab|cep|rua |bairro|endere/.test(lower)) {
      calls.push({
        id: "t1",
        name: "check_viability",
        arguments: extractLocation(lastUser),
      });
    } else if (/aceito|fechar|fechar negócio|pode cadastrar|quero esse/.test(lower)) {
      calls.push({ id: "t1", name: "create_pre_sale", arguments: {} });
    } else if (/plano|oferta|preço|preco|mega|internet|melhor/.test(lower)) {
      calls.push({ id: "t1", name: "search_offers", arguments: { query: lastUser } });
    } else {
      calls.push({ id: "t1", name: "update_lead_stage", arguments: { status: "QUALIFICANDO" } });
      calls.push({ id: "t2", name: "get_customer", arguments: {} });
    }

    return { model: this.name, content: "", toolCalls: calls };
  }
}

function extractLocation(text: string) {
  const cep = text.match(/\d{5}-?\d{3}/)?.[0];
  const cities = ["Fortaleza", "Caucaia", "Maracanaú", "Mossoró", "Natal", "João Pessoa", "Recife", "Juazeiro do Norte", "Sobral"];
  const city = cities.find((c) => text.toLowerCase().includes(c.toLowerCase()));
  return { city, zipCode: cep, address: text };
}

function composeFromTools(userText: string, toolJson: string): string {
  try {
    const data = JSON.parse(toolJson);
    if (data.blocked) {
      return "Preciso encaminhar este caso para um atendente humano. Não posso inventar informação comercial que não esteja cadastrada.";
    }
    if (data.handoff) {
      return "Certo, vou transferir você para um atendente humano agora. A IA fica pausada nesta conversa.";
    }
    if (data.preSale) {
      return `Perfeito. Registrei o aceite e enviei a venda pré-fechada para a fila operacional.\n\nResumo: ${data.preSale.aiSummary ?? "oferta aceita"}. Um operador lança o pedido no sistema corporativo e eu te aviso o resultado.`;
    }
    if (data.viability) {
      if (data.viability.result === "VIAVEL" && data.viability.reliable) {
        return `Consultei a base interna autorizada: há indicação de viabilidade em ${data.viability.city ?? "sua cidade"}. Vou buscar as ofertas vigentes aprovadas para essa região.`;
      }
      if (data.viability.result === "NAO_VIAVEL") {
        return "A consulta autorizada não confirmou cobertura neste endereço. Não posso afirmar viabilidade. Posso registrar interesse e encaminhar para um humano.";
      }
      return "Ainda não tenho um retorno confiável de viabilidade para esse endereço. Não vou afirmar cobertura. Vou sinalizar para consulta manual do operador.";
    }
    if (data.offers?.length) {
      const o = data.offers[0];
      const price = o.promotionalPriceCents
        ? `R$ ${(o.promotionalPriceCents / 100).toFixed(2)} (promocional)`
        : o.priceCents
          ? `R$ ${(o.priceCents / 100).toFixed(2)}`
          : "preço conforme oferta aprovada";
      return `Encontrei ofertas vigentes e aprovadas. A recomendada é **${o.name}** (${o.speedMbps ?? "—"} Mega) por ${price}. Benefícios cadastrados: ${(o.benefits ?? []).join(", ") || "conforme book"}. Posso comparar com a alternativa ou seguir para o aceite.`;
    }
    if (data.faq) {
      return data.faq;
    }
    if (data.objectionResponse) {
      return data.objectionResponse;
    }
  } catch {
    /* fallthrough */
  }
  return "Para te indicar um plano com segurança, preciso da cidade e do que você precisa (casa, home office, quantidade de pessoas). Só trabalho com ofertas aprovadas no sistema — sem inventar preço.";
}
