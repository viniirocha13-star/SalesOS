import { aiModelFor, reasoningEffortFor, type AiTask } from "@/lib/ai-models";

export type LlmMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: LlmToolCall[];
};

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
  usage?: { input?: number; output?: number; cached?: number };
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
    const body: Record<string, unknown> = {
      model,
      messages: input.messages.map(toChatMessage),
    };
    if (input.tools.length) {
      body.tools = input.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      // gpt-5.6-luna rejeita tools no Chat Completions se reasoning_effort ≠ none.
      body.reasoning_effort = "none";
    }
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Falha na API OpenAI (${res.status})`);
    const json = (await res.json()) as {
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
      choices: {
        message: {
          content?: string | null;
          tool_calls?: { id: string; function: { name: string; arguments: string } }[];
        };
      }[];
    };
    const msg = json.choices[0]?.message;
    return {
      model,
      content: msg?.content ?? "",
      usage: {
        input: json.usage?.prompt_tokens,
        output: json.usage?.completion_tokens,
        cached: json.usage?.prompt_tokens_details?.cached_tokens,
      },
      toolCalls: (msg?.tool_calls ?? []).map((c) => ({
        id: c.id,
        name: c.function.name,
        arguments: JSON.parse(c.function.arguments || "{}"),
      })),
    };
  }

  private async responses(
    key: string,
    model: string,
    input: { messages: LlmMessage[]; tools: LlmTool[]; purpose?: AiTask },
  ): Promise<LlmResult> {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning: { effort: reasoningEffortFor(input.purpose ?? "SALES") },
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
      output?: {
        type: string;
        name?: string;
        arguments?: string;
        call_id?: string;
        content?: { type?: string; text?: string }[];
      }[];
      usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } };
    };
    const text =
      json.output_text ??
      (json.output ?? [])
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === "output_text" && c.text)
        .map((c) => c.text as string)
        .join("\n");
    return {
      model,
      content: text,
      usage: {
        input: json.usage?.input_tokens,
        output: json.usage?.output_tokens,
        cached: json.usage?.input_tokens_details?.cached_tokens,
      },
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

function toChatMessage(m: LlmMessage): Record<string, unknown> {
  if (m.role === "tool") {
    return { role: "tool", tool_call_id: m.toolCallId ?? m.name, content: m.content };
  }
  if (m.toolCalls?.length) {
    return {
      role: "assistant",
      content: m.content || null,
      tool_calls: m.toolCalls.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.name, arguments: JSON.stringify(c.arguments ?? {}) },
      })),
    };
  }
  return { role: m.role, content: m.content };
}

/** Mock só em testes (Vitest) ou quando não há chave. Com OPENAI_API_KEY no app, usa API real. */
export function shouldUseMockLlm() {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") return true;
  return !process.env.OPENAI_API_KEY;
}

export function getLlmProvider(): LlmProvider {
  if (shouldUseMockLlm()) return new DevMockLlmProvider();
  return new OpenAiLlmProvider();
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

    const collecting = isCollectingPhase(input.messages);
    const cadastro = extractCadastroField(lastUser, collecting);
    const calls: LlmToolCall[] = [];
    if (/humano|atendente|pessoa|reclam/.test(lower)) {
      calls.push({ id: "t1", name: "request_human_handoff", arguments: { reason: "CLIENTE_SOLICITOU" } });
    } else if (/se (fizer|baixar|tiver).*(fecho|pego|levo)|fecho agora/.test(lower)) {
      calls.push({ id: "t1", name: "get_objection_context", arguments: { objection_type: "PRECO" } });
      calls.push({ id: "t2", name: "search_eligible_offers", arguments: extractLocation(lastUser) });
      calls.push({ id: "t3", name: "register_buying_intent", arguments: { notes: "high_intent_conditional" } });
    } else if (/pode fazer|pode cadastrar|aceito|pode ser essa|tá bom|ta bom/.test(lower)) {
      calls.push({ id: "t1", name: "register_commercial_acceptance", arguments: {} });
    } else if (cadastro) {
      calls.push({ id: "t1", name: "save_customer_field", arguments: cadastro });
      calls.push({ id: "t2", name: "get_required_customer_fields", arguments: {} });
    } else if (collecting) {
      calls.push({ id: "t1", name: "get_required_customer_fields", arguments: {} });
    } else if (/não quero|nao quero|caro|depois|pensar|concorrente|puxado|a outra/.test(lower)) {
      calls.push({ id: "t1", name: "register_objection", arguments: { text: lastUser } });
      calls.push({ id: "t2", name: "get_objection_context", arguments: { objection_type: "PRECO" } });
    } else if (/viab|cep|rua |bairro|endere/.test(lower)) {
      calls.push({ id: "t1", name: "check_viability", arguments: extractLocation(lastUser) });
    } else if (/netflix|roaming|instala|wi-?fi|ilimitado|amazon|prime|fwa\b/.test(lower) && !/quero internet|caro|aceito|pode fazer/.test(lower)) {
      calls.push({ id: "t1", name: "get_product_knowledge", arguments: { query: lastUser } });
      calls.push({ id: "t2", name: "search_eligible_offers", arguments: { query: lastUser, ...extractLocation(lastUser) } });
    } else if (/plano|oferta|preço|preco|mega|internet|melhor|quanto|combo/.test(lower)) {
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

function isCollectingPhase(messages: LlmMessage[]) {
  const blob = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  return /COMMERCIAL_ACCEPTANCE|DATA_COLLECTION|PRE_SALE_READY/.test(blob) || /"CommercialAcceptance":\s*\{/.test(blob);
}

function extractCadastroField(text: string, collecting: boolean): { field: string; value: string } | null {
  const digits = text.replace(/\D/g, "");
  if (/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(text) && digits.length === 11) {
    return { field: "CPF", value: text.trim() };
  }
  if (collecting && /\b\d{5}-?\d{3}\b/.test(text) && digits.length <= 8) {
    return { field: "CEP", value: text.match(/\b\d{5}-?\d{3}\b/)?.[0] ?? text.trim() };
  }
  if (collecting && /rua |avenida |av\.|travessa |alameda |bairro /i.test(text)) {
    return { field: "ADDRESS", value: text.trim() };
  }
  if (
    collecting &&
    /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){1,6}$/.test(text.trim()) &&
    !/internet|plano|oferta|mega|caro|aceito/i.test(text)
  ) {
    return { field: "FULL_NAME", value: text.trim() };
  }
  return null;
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
    if (data.knowledge?.length) {
      const k = data.knowledge[0];
      return `${k.title}: ${String(k.content).split("\n")[0]}`;
    }
    if (data.comparison?.length) {
      return data.comparison
        .map((o: { name: string; price?: number; speedMbps?: number }) => {
          const price = o.price != null ? `R$ ${(o.price / 100).toFixed(2).replace(".", ",")}` : "";
          return `${o.name} ${o.speedMbps ? `${o.speedMbps} Mega` : ""} ${price}`.trim();
        })
        .join(" · ");
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
    if (data.error === "cpf_invalido") {
      return "Esse CPF não passou na validação. Pode conferir os dígitos?";
    }
    if (Array.isArray(data.missing)) {
      if (!data.remaining) {
        return "Recebi os dados. O pedido foi para a fila. O operador lança no sistema — eu não disparo o cadastro corporativo.";
      }
      const labels: Record<string, string> = {
        FULL_NAME: "o nome completo",
        CPF: "o CPF",
        ADDRESS: "o endereço",
        CITY: "a cidade",
        CEP: "o CEP",
      };
      const next = String(data.missing[0] ?? "");
      return `Pode me passar ${labels[next] ?? next}? Só o que o sistema ainda pediu.`;
    }
    if (data.ready_for_operator_launch) {
      return "Pronto. Seus dados chegaram. A equipe operacional lança no sistema.";
    }
    if (data.accepted) {
      return "Fechado no plano que já te mostrei. Agora preciso só dos dados cadastrais que o sistema pediu — começo pelo nome completo.";
    }
    if (data.allowed_arguments && !data.reply) {
      const bill = data.customer_context?.current_bill;
      const alts = data.alternative_offers as { name?: string; priceCents?: number }[] | undefined;
      if (userText.toLowerCase().includes("80") && /fecho|fizer/.test(userText.toLowerCase())) {
        if (alts?.[0]?.priceCents) {
          return `Não consigo igualar R$80 se essa condição não estiver cadastrada. Tem ${alts[0].name} aprovada a R$ ${(alts[0].priceCents / 100).toFixed(2).replace(".", ",")} — quer que eu compare o que entra em cada uma?`;
        }
        return "R$80 não está nas ofertas aprovadas para o seu endereço. Posso reforçar o que entra no plano vigente ou ver se existe outra opção elegível — sem inventar desconto.";
      }
      if (bill) {
        return `Você comentou que hoje gira em torno de R$${bill}. Posso olhar só o que está aprovado no seu endereço e ver se alguma opção fecha melhor essa conta — sem inventar desconto.`;
      }
      return "Quero entender a comparação que você está fazendo antes de insistir no plano. Isso que você citou é só internet ou tem mais serviço no valor?";
    }
    if (data.faq) return String(data.faq).slice(0, 400);
  } catch {
    /* fallthrough */
  }
  if (/caro|preço|preco/.test(userText.toLowerCase())) {
    return "Hoje você paga quanto na internet?";
  }
  return "Me fala a cidade e se é mais pra casa, trabalho ou os dois. Aí eu te mostro só o que está aprovado pra você.";
}
