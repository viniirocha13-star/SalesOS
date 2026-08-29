export type IntentType =
  | "BUY"
  | "QUESTION"
  | "OBJECTION"
  | "NEGOTIATION"
  | "HUMAN_REQUEST"
  | "COMPLAINT"
  | "DATA"
  | "CANCEL"
  | "OTHER";

export type BuyingIntent = "LOW" | "MEDIUM" | "HIGH" | "EXPLICIT_ACCEPTANCE";

/** Sinal auxiliar — não é roteiro de resposta. */
export function classifyIntentSignals(text: string): { intent: IntentType; buyingIntent: BuyingIntent } {
  const t = text.toLowerCase();
  if (/atendente|humano|pessoa|gerente/.test(t)) return { intent: "HUMAN_REQUEST", buyingIntent: "LOW" };
  if (/reclam|procon|processo/.test(t)) return { intent: "COMPLAINT", buyingIntent: "LOW" };
  if (/cancel|desistir|não quero|nao quero/.test(t)) return { intent: "CANCEL", buyingIntent: "LOW" };
  if (/pode fazer|pode cadastrar|fecha|fechar|aceito|pode ser essa/.test(t)) {
    return { intent: "BUY", buyingIntent: "EXPLICIT_ACCEPTANCE" };
  }
  if (/se (fizer|baixar|tiver).*(fecho|pego|levo)|fecho agora/.test(t)) {
    return { intent: "NEGOTIATION", buyingIntent: "HIGH" };
  }
  if (/caro|puxado|concorr|80|outra aqui|tá alto|ta alto/.test(t)) {
    return { intent: "OBJECTION", buyingIntent: /fecho|pego|quero/.test(t) ? "HIGH" : "MEDIUM" };
  }
  if (/quanto|preço|preco|valor|fica quanto/.test(t)) return { intent: "QUESTION", buyingIntent: "MEDIUM" };
  if (/cpf|cep|rua |endere|e-mail|email|nasci/.test(t)) return { intent: "DATA", buyingIntent: "MEDIUM" };
  if (/quero|internet|plano|fibra/.test(t)) return { intent: "BUY", buyingIntent: "MEDIUM" };
  return { intent: "OTHER", buyingIntent: "LOW" };
}

export function classifyStrategy(input: {
  intent: IntentType;
  buyingIntent: BuyingIntent;
  hasCurrentBill: boolean;
  mentionedCompetitor: boolean;
  hasAlternative: boolean;
}): string {
  if (input.buyingIntent === "EXPLICIT_ACCEPTANCE") return "PROCEED_TO_CLOSE";
  if (input.buyingIntent === "HIGH" && input.hasAlternative) return "SEARCH_ALTERNATIVE";
  if (input.buyingIntent === "HIGH") return "ASK_FOR_DECISION";
  if (input.mentionedCompetitor) return "CLARIFY_COMPARISON";
  if (input.intent === "OBJECTION" && !input.hasCurrentBill) return "DISCOVER_CURRENT_PRICE";
  if (input.intent === "OBJECTION") return "REINFORCE_VALUE";
  if (input.intent === "QUESTION") return "COMPARE_OFFERS";
  return "CLARIFY_OBJECTION";
}
