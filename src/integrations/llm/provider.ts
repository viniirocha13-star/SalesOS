import { aiModelFor, type AiTask } from "@/lib/ai-models";

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
  intent?: string;
  usage?: { input?: number; output?: number };
};

export interface LlmProvider {
  readonly name: string;
  complete(input: {
    messages: LlmMessage[];
    tools: LlmTool[];
    purpose?: "SALES" | "UTILITY" | "COMPLEX";
  }): Promise<LlmResult>;
}

export class OpenAiLlmProvider implements LlmProvider {
  readonly name = "openai";

  async complete(input: { messages: LlmMessage[]; tools: LlmTool[]; purpose?: AiTask }): Promise<LlmResult> {
    const key = process.env.OPENAI_API_KEY;
    const model = aiModelFor(input.purpose ?? "SALES");
    if (!key) throw new Error("OPENAI_API_KEY ausente");
    if (process.env.OPENAI_API_STYLE === "chat") {
      return this.chatCompletions(key, model, input);
    }
    return this.responses(key, model, input);
  }

  private async chatCompletions(key: string, model: string, input: { messages: LlmMessage[]; tools: LlmTool[] }): Promise<LlmResult> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
    if (!res.ok) throw new Error("Falha na API OpenAI");
    const json = (await res.json()) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
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
      usage: { input: json.usage?.prompt_tokens, output: json.usage?.completion_tokens },
      toolCalls: (msg?.tool_calls ?? []).map((c) => ({
        id: c.id,
        name: c.function.name,
        arguments: JSON.parse(c.function.arguments || "{}"),
      })),
    };
  }

  private async responses(key: string, model: string, input: { messages: LlmMessage[]; tools: LlmTool[] }): Promise<LlmResult> {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: input.messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
        tools: input.tools.map((t) => ({
          type: "function",
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }),
    });
    if (!res.ok) return this.chatCompletions(key, model, input);
    const json = (await res.json()) as {
      output_text?: string;
      output?: { type: string; name?: string; arguments?: string; call_id?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      model,
      content: json.output_text ?? "",
      usage: { input: json.usage?.input_tokens, output: json.usage?.output_tokens },
      toolCalls: (json.output ?? [])
        .filter((o) => o.type === "function_call")
        .map((o) => ({
          id: o.call_id ?? "tool",
          name: o.name ?? "",
          arguments: JSON.parse(o.arguments || "{}"),
        })),
    };
  }
}

export function getLlmProvider(): LlmProvider {
  if (process.env.OPENAI_API_KEY) return new OpenAiLlmProvider();
  return new DevMockLlmProvider();
}

export class DevMockLlmProvider implements LlmProvider {
  readonly name = "dev_mock_llm";

  async complete(input: { messages: LlmMessage[]; tools: LlmTool[] }): Promise<LlmResult> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const lower = lastUser.toLowerCase();
    const hasToolResults = input.messages.some((m) => m.role === "tool");

    if (hasToolResults) {
      const lastTool = [...input.messages].reverse().find((m) => m.role === "tool");
      return { model: this.name, toolCalls: [], content: composeFromTools(lastUser, lastTool?.content ?? "") };
    }

    const calls: LlmToolCall[] = [];
    if (/humano|atendente|pessoa|reclam/.test(lower)) {
      calls.push({ id: "t1", name: "request_human_handoff", arguments: { reason: "CLIENTE_SOLICITOU" } });
    } else if (/não quero|nao quero|caro|depois|pensar|concorrente/.test(lower)) {
      calls.push({ id: "t1", name: "register_objection", arguments: { text: lastUser } });
    } else if (/viab|cep|rua |bairro|endere/.test(lower)) {
      calls.push({ id: "t1", name: "check_viability", arguments: extractLocation(lastUser) });
    } else if (/aceito|fechar|pode cadastrar|quero esse|fecha/.test(lower)) {
      calls.push({ id: "t1", name: "register_buying_intent", arguments: {} });
    } else if (/plano|oferta|preço|preco|mega|internet|melhor/.test(lower)) {
      const city = extractLocation(lastUser).city;
      if (city) calls.push({ id: "t0", name: "update_customer_fact", arguments: { key: "city", value: city } });
      calls.push({ id: "t1", name: "search_eligible_offers", arguments: { query: lastUser, city } });
    } else {
      calls.push({ id: "t1", name: "set_sales_stage", arguments: { stage: "DISCOVERY" } });
      calls.push({ id: "t2", name: "get_customer_context", arguments: {} });
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
    if (data.blocked) return "Isso eu preciso confirmar com um atendente. Não posso inventar condição comercial.";
    if (data.handoff) return "Beleza, vou te passar pra um atendente agora.";
    if (data.preSale) return "Fechado. Vou encaminhar seu cadastro pra equipe operacional. Assim que tiver retorno, te aviso aqui.";
    if (data.viability) {
      if (data.viability.result === "VIAVEL" && data.viability.reliable) {
        return `Em ${data.viability.city ?? "sua cidade"} a consulta autorizada indica cobertura. Quer que eu te mostre as opções vigentes?`;
      }
      if (data.viability.result === "NAO_VIAVEL") {
        return "Por esse endereço a consulta autorizada não confirma cobertura. Posso registrar seu interesse pra expansão.";
      }
      return "Ainda não tenho um retorno confiável de cobertura. Não vou te afirmar que tem sinal. Posso pedir uma checagem manual.";
    }
    if (data.offers?.length) {
      const o = data.offers[0];
      const price = o.promotionalPriceCents
        ? `R$ ${(o.promotionalPriceCents / 100).toFixed(2).replace(".", ",")}`
        : o.priceCents
          ? `R$ ${(o.priceCents / 100).toFixed(2).replace(".", ",")}`
          : null;
      if (!price) return "Tem opção aprovada pra sua região, mas o preço não está cadastrado. Vou passar pra um humano.";
      return `${o.name}, ${o.speedMbps ?? "—"} Mega, ${price} no valor da oferta vigente. ${((o.benefits as string[]) ?? []).slice(0, 2).join(", ")}. Faz sentido pra você?`;
    }
    if (data.objectionResponse) return data.objectionResponse;
    if (data.faq) return String(data.faq).slice(0, 400);
  } catch {
    /* fallthrough */
  }
  if (/caro|preço|preco/.test(userText.toLowerCase())) {
    return "Hoje você paga quanto na internet?";
  }
  return "Me fala a cidade e se é mais pra casa, trabalho ou os dois. Aí eu te mostro só o que está aprovado pra você.";
}
