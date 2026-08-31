export type SalesIntent =
  | "greeting"
  | "buy"
  | "qualify"
  | "price"
  | "objection"
  | "question"
  | "portability"
  | "handoff"
  | "pause"
  | "unknown";

export type QualificationStatus = "unqualified" | "partial" | "qualified" | "accepted" | "lost";

export type NextBestAction =
  | "greet_and_qualify"
  | "ask_city"
  | "ask_product"
  | "confirm_known_facts"
  | "consult_city_availability"
  | "consult_offers"
  | "consult_portability"
  | "present_authorized_offer"
  | "handle_objection"
  | "handle_explicit_refusal"
  | "advance_close"
  | "collect_cadastro"
  | "resume_memory"
  | "handoff_human"
  | "wait";

export type SalesConversationState = {
  intent: SalesIntent;
  cidade: string | null;
  produto_interesse: string | null;
  internet_interesse: boolean | null;
  portabilidade: boolean | null;
  operadora_atual: string | null;
  quantidade_linhas: number | null;
  perfil_cliente: string | null;
  oferta_interesse: string | null;
  objections: string[];
  qualification_status: QualificationStatus;
  missing_fields: string[];
  next_best_action: NextBestAction;
  handoff_required: boolean;
  handoff_reason: string | null;
  refused_products: string[];
  ddd_origem: string | null;
  current_bill: string | null;
  last_customer_utterance: string | null;
  presented_greeting: boolean;
};

export const EMPTY_SALES_STATE: SalesConversationState = {
  intent: "unknown",
  cidade: null,
  produto_interesse: null,
  internet_interesse: null,
  portabilidade: null,
  operadora_atual: null,
  quantidade_linhas: null,
  perfil_cliente: null,
  oferta_interesse: null,
  objections: [],
  qualification_status: "unqualified",
  missing_fields: ["cidade", "produto_interesse"],
  next_best_action: "greet_and_qualify",
  handoff_required: false,
  handoff_reason: null,
  refused_products: [],
  ddd_origem: null,
  current_bill: null,
  last_customer_utterance: null,
  presented_greeting: false,
};

export function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((v): v is string => Boolean(v && String(v).trim())))];
}

export function mergeSalesState(
  previous: Partial<SalesConversationState> | null | undefined,
  patch: Partial<SalesConversationState>,
): SalesConversationState {
  const base: SalesConversationState = { ...EMPTY_SALES_STATE, ...previous };
  const next: SalesConversationState = {
    ...base,
    ...patch,
    objections: uniqueStrings([...(base.objections ?? []), ...(patch.objections ?? [])]),
    refused_products: uniqueStrings([...(base.refused_products ?? []), ...(patch.refused_products ?? [])]),
  };
  if (patch.cidade === undefined) next.cidade = base.cidade;
  if (patch.produto_interesse === undefined) next.produto_interesse = base.produto_interesse;
  if (patch.internet_interesse === undefined) next.internet_interesse = base.internet_interesse;
  if (patch.portabilidade === undefined) next.portabilidade = base.portabilidade;
  if (patch.operadora_atual === undefined) next.operadora_atual = base.operadora_atual;
  if (patch.quantidade_linhas === undefined) next.quantidade_linhas = base.quantidade_linhas;
  if (patch.perfil_cliente === undefined) next.perfil_cliente = base.perfil_cliente;
  if (patch.oferta_interesse === undefined) next.oferta_interesse = base.oferta_interesse;
  if (patch.ddd_origem === undefined) next.ddd_origem = base.ddd_origem;
  if (patch.current_bill === undefined) next.current_bill = base.current_bill;
  if (patch.handoff_required === undefined) next.handoff_required = base.handoff_required;
  if (patch.handoff_reason === undefined) next.handoff_reason = base.handoff_reason;
  if (patch.presented_greeting === undefined) next.presented_greeting = base.presented_greeting;
  return next;
}

export function computeMissingFields(state: SalesConversationState): string[] {
  const missing: string[] = [];
  if (!state.cidade) missing.push("cidade");
  if (!state.produto_interesse) missing.push("produto_interesse");
  const chipOnly = isChipOnly(state);
  if (!chipOnly && state.internet_interesse == null && !state.produto_interesse) {
    missing.push("internet_interesse");
  }
  if (chipOnly && state.portabilidade == null && state.operadora_atual) {
    /* portability optional until asked; not blocking */
  }
  return missing;
}

export function isChipOnly(state: Pick<SalesConversationState, "produto_interesse" | "internet_interesse" | "refused_products">) {
  if (state.internet_interesse === false) return true;
  if (state.refused_products.some((p) => /internet|fibra|banda|bl\b/i.test(p))) return true;
  return /chip|m[oó]vel|5g/i.test(state.produto_interesse ?? "") && !/combo|fibra|internet/i.test(state.produto_interesse ?? "");
}

export function compactSalesStateForPrompt(state: SalesConversationState) {
  return {
    intent: state.intent,
    cidade: state.cidade,
    produto_interesse: state.produto_interesse,
    internet_interesse: state.internet_interesse,
    portabilidade: state.portabilidade,
    operadora_atual: state.operadora_atual,
    quantidade_linhas: state.quantidade_linhas,
    perfil_cliente: state.perfil_cliente,
    oferta_interesse: state.oferta_interesse,
    objections: state.objections,
    qualification_status: state.qualification_status,
    missing_fields: state.missing_fields,
    next_best_action: state.next_best_action,
    handoff_required: state.handoff_required,
    handoff_reason: state.handoff_reason,
    refused_products: state.refused_products,
    ddd_origem: state.ddd_origem,
    current_bill: state.current_bill,
    presented_greeting: state.presented_greeting,
  };
}
