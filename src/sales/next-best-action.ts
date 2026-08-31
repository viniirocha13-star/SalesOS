import {
  computeMissingFields,
  isChipOnly,
  type NextBestAction,
  type QualificationStatus,
  type SalesConversationState,
} from "@/sales/conversation-state";

export function decideNextBestAction(
  state: SalesConversationState,
  opts: {
    cityAvailable?: boolean | null;
    hasEligibleOffers?: boolean;
    hasAcceptance?: boolean;
    customerAskedHuman?: boolean;
    unsolvable?: boolean;
    returningCustomer?: boolean;
  } = {},
): { next_best_action: NextBestAction; qualification_status: QualificationStatus; missing_fields: string[]; handoff_required: boolean; handoff_reason: string | null } {
  const missing = computeMissingFields(state);
  if (opts.customerAskedHuman || state.handoff_required) {
    return {
      next_best_action: "handoff_human",
      qualification_status: state.qualification_status,
      missing_fields: missing,
      handoff_required: true,
      handoff_reason: state.handoff_reason ?? "CLIENTE_SOLICITOU",
    };
  }
  if (opts.unsolvable) {
    return {
      next_best_action: "handoff_human",
      qualification_status: state.qualification_status,
      missing_fields: missing,
      handoff_required: true,
      handoff_reason: "INFORMACAO_NAO_ENCONTRADA",
    };
  }
  if (opts.hasAcceptance) {
    return {
      next_best_action: "collect_cadastro",
      qualification_status: "accepted",
      missing_fields: missing,
      handoff_required: false,
      handoff_reason: null,
    };
  }
  if (opts.returningCustomer && (state.cidade || state.produto_interesse)) {
    return {
      next_best_action: "resume_memory",
      qualification_status: missing.length ? "partial" : "qualified",
      missing_fields: missing,
      handoff_required: false,
      handoff_reason: null,
    };
  }

  const chipOnly = isChipOnly(state);
  const lastObj = state.objections.at(-1);
  if (lastObj === "SO_QUERO_CHIP" || chipOnly) {
    if (state.cidade && opts.cityAvailable == null) {
      return finish("consult_city_availability", missing);
    }
    if (state.cidade && opts.hasEligibleOffers) {
      return finish("present_authorized_offer", missing, "qualified");
    }
    if (state.cidade) {
      return finish("consult_offers", missing, missing.length ? "partial" : "qualified");
    }
    return finish("ask_city", missing);
  }

  if (state.objections.length && lastObj && lastObj !== "SO_QUERO_CHIP") {
    return finish("handle_objection", missing, missing.length ? "partial" : "qualified");
  }

  if (state.refused_products.length && /internet|fibra/.test(state.refused_products.join(" "))) {
    if (!state.cidade) return finish("ask_city", missing);
    return finish("handle_explicit_refusal", missing, "partial");
  }

  if (!state.cidade && !state.produto_interesse) {
    return finish(state.presented_greeting ? "ask_product" : "greet_and_qualify", missing);
  }
  if (!state.cidade) return finish("ask_city", missing);
  if (!state.produto_interesse) return finish("ask_product", missing);

  if (opts.cityAvailable == null) return finish("consult_city_availability", missing, "partial");
  if (opts.hasEligibleOffers) return finish("present_authorized_offer", missing, "qualified");
  return finish("consult_offers", missing, "partial");

  function finish(
    action: NextBestAction,
    fields: string[],
    status: QualificationStatus = fields.length ? "partial" : "unqualified",
  ) {
    return {
      next_best_action: action,
      qualification_status: status,
      missing_fields: fields,
      handoff_required: false,
      handoff_reason: null,
    };
  }
}

export function recommendedTools(action: NextBestAction): string[] {
  switch (action) {
    case "consult_city_availability":
      return ["check_city_availability", "get_sales_conversation_state"];
    case "consult_offers":
    case "present_authorized_offer":
      return ["search_eligible_offers", "get_current_offers"];
    case "consult_portability":
      return ["get_portability_info"];
    case "handle_objection":
      return ["register_objection", "get_objection_context", "get_faq"];
    case "collect_cadastro":
      return ["get_required_customer_fields", "save_customer_field"];
    case "resume_memory":
      return ["get_sales_conversation_state", "get_customer_context", "get_sale_status"];
    case "handoff_human":
      return ["request_human_handoff"];
    default:
      return ["get_sales_conversation_state"];
  }
}
