import { prisma } from "@/lib/prisma";
import { selectOffers } from "@/offer-engine/select";
import { createPreSale } from "@/domain/presale";
import { transitionLead } from "@/domain/leads";
import { retrieveKnowledge } from "@/ai/rag";
import { emit } from "@/events/bus";
import type { HandoffReason, LeadStatus, ObjectionCategory } from "@prisma/client";
import { classifyObjectionTaxonomy, taxonomyToPrisma } from "@/commercial/objection-taxonomy";

export const SALES_TOOLS = [
  {
    name: "get_customer_context",
    description: "Lê dados já conhecidos do lead, fatos e estágio. Não inventa.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "update_customer_fact",
    description: "Persiste um fato do cliente (cidade, nome, interesse, provedor atual, orçamento).",
    parameters: {
      type: "object",
      properties: { key: { type: "string" }, value: { type: "string" } },
      required: ["key", "value"],
    },
  },
  {
    name: "set_sales_stage",
    description: "Atualiza o estágio comercial da conversa no backend.",
    parameters: {
      type: "object",
      properties: { stage: { type: "string" }, reason: { type: "string" } },
      required: ["stage"],
    },
  },
  {
    name: "search_eligible_offers",
    description: "Busca somente ofertas APROVADAS e vigentes no Offer Engine. Nunca inventa preço.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" }, city: { type: "string" }, users: { type: "number" }, need: { type: "string" } },
    },
  },
  {
    name: "get_offer_details",
    description: "Obtém uma oferta aprovada e vigente pelo id.",
    parameters: { type: "object", properties: { offerId: { type: "string" } }, required: ["offerId"] },
  },
  {
    name: "register_buying_intent",
    description: "Registra intenção de compra explícita do cliente.",
    parameters: { type: "object", properties: { offerId: { type: "string" }, notes: { type: "string" } } },
  },
  {
    name: "request_human_handoff",
    description:
      "Handoff só se o cliente pediu humano, regra explícita ou caso insolúvel. Sempre informe reason. Cliente ter respondido NÃO autoriza pausa.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" }, notes: { type: "string" } },
      required: ["reason"],
    },
  },
  {
    name: "get_sales_conversation_state",
    description: "Lê o Sales Conversation State já extraído (cidade, produto, recusas, NBA). Não inventa.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_current_offers",
    description: "Ofertas vigentes elegíveis do Offer Engine para o lead. Sem inventar preço.",
    parameters: {
      type: "object",
      properties: { city: { type: "string" }, need: { type: "string" }, query: { type: "string" } },
    },
  },
  {
    name: "get_book_commercial",
    description: "Consulta o book comercial ACTIVE (fatos aprovados). Troca de book não exige reprogramar a Luna.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "check_city_availability",
    description: "Cidades/regiões com oferta APROVADA no book ACTIVE. Nunca inventa cobertura.",
    parameters: { type: "object", properties: { city: { type: "string" } } },
  },
  {
    name: "get_portability_info",
    description: "Regras de portabilidade aprovadas + fatos do lead (operadora, DDD). Sem inventar prazo.",
    parameters: { type: "object", properties: { query: { type: "string" } } },
  },
  {
    name: "get_sale_status",
    description: "Status da venda: estágio, aceite, pré-venda, handoff.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_collected_lead_data",
    description: "Dados já coletados do lead (sem CPF completo).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_documentation_requirements",
    description: "Documentação obrigatória cadastrada no sistema.",
    parameters: { type: "object", properties: { productType: { type: "string" } } },
  },
  {
    name: "search_offers",
    description: "Alias de search_eligible_offers.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" }, city: { type: "string" }, users: { type: "number" } },
    },
  },
  {
    name: "get_offer",
    description: "Alias de get_offer_details.",
    parameters: { type: "object", properties: { offerId: { type: "string" } }, required: ["offerId"] },
  },
  {
    name: "check_viability",
    description:
      "Geocodifica o endereço e consulta a API oficial (se houver). Sem API, entra na fila para o operador olhar a caixa. Nunca afirmar VIAVEL sem reliable=true.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string" },
        zipCode: { type: "string" },
        city: { type: "string" },
        neighborhood: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
      },
    },
  },
  {
    name: "get_customer",
    description: "Lê dados já conhecidos do lead/cliente.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "update_customer",
    description: "Atualiza dados de qualificação. Não altera preço nem cria oferta.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        city: { type: "string" },
        neighborhood: { type: "string" },
        address: { type: "string" },
        zipCode: { type: "string" },
        productInterest: { type: "string" },
      },
    },
  },
  {
    name: "update_lead_stage",
    description: "Atualiza o estágio do pipeline.",
    parameters: { type: "object", properties: { status: { type: "string" }, reason: { type: "string" } } },
  },
  {
    name: "create_pre_sale",
    description: "Cria pré-venda após aceite explícito, usando oferta já apresentada.",
    parameters: { type: "object", properties: { offerId: { type: "string" } } },
  },
  {
    name: "request_human",
    description: "Alias de request_human_handoff.",
    parameters: { type: "object", properties: { reason: { type: "string" }, notes: { type: "string" } } },
  },
  {
    name: "get_faq",
    description: "Busca FAQ e políticas aprovadas (RAG).",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "register_objection",
    description: "Registra objeção e busca argumento aprovado.",
    parameters: { type: "object", properties: { text: { type: "string" }, category: { type: "string" } } },
  },
  {
    name: "register_loss_reason",
    description: "Registra motivo de perda.",
    parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
  },
  {
    name: "get_objection_context",
    description: "Contexto estruturado da objeção. Nunca devolve resposta pronta ao cliente.",
    parameters: { type: "object", properties: { objection_type: { type: "string" } } },
  },
  {
    name: "compare_offers",
    description: "Compara duas ofertas aprovadas. Só fatos do cadastro.",
    parameters: { type: "object", properties: { offerIdA: { type: "string" }, offerIdB: { type: "string" } }, required: ["offerIdA", "offerIdB"] },
  },
  {
    name: "register_commercial_acceptance",
    description: "Registra aceite após oferta apresentada e vigente.",
    parameters: { type: "object", properties: { offerId: { type: "string" } } },
  },
  {
    name: "get_required_customer_fields",
    description: "Lista campos cadastrais ainda faltantes. Sem pedir tudo de uma vez.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "save_customer_field",
    description: "Grava um campo cadastral. CPF é validado, criptografado e nunca volta completo.",
    parameters: {
      type: "object",
      properties: { field: { type: "string" }, value: { type: "string" } },
      required: ["field", "value"],
    },
  },
  {
    name: "search_products",
    description: "Busca produtos do book ACTIVE com filtros (categoria, cidade, canal, streaming, dados, velocidade).",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string" },
        city: { type: "string" },
        streaming: { type: "string" },
        speed: { type: "number" },
        budget: { type: "number" },
        acquisition_type: { type: "string" },
        query: { type: "string" },
      },
    },
  },
  {
    name: "get_product_knowledge",
    description: "Consulta facts aprovados do book (Netflix, roaming, instalação, Wi-Fi, apps, FWA, combo). Nunca inventa.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "compare_products",
    description: "Compara ofertas do book: preço, promoção, pós-promoção, velocidade/dados, streaming, apps.",
    parameters: { type: "object", properties: { offerIds: { type: "array", items: { type: "string" } }, offerIdA: { type: "string" }, offerIdB: { type: "string" } } },
  },
  {
    name: "get_business_rule",
    description: "Consulta regra comercial aprovada na base de conhecimento.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
] as const;

const TOOL_ALIAS: Record<string, string> = {
  search_offers: "search_eligible_offers",
  search_products: "search_eligible_offers",
  get_offer: "get_offer_details",
  get_customer: "get_customer_context",
  update_customer: "update_customer_fact",
  update_lead_stage: "set_sales_stage",
  request_human: "request_human_handoff",
  compare_products: "compare_offers",
  get_current_offers: "search_eligible_offers",
  get_book_commercial: "get_product_knowledge",
  get_collected_lead_data: "get_customer_context",
};

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { leadId: string; conversationId: string },
): Promise<Record<string, unknown>> {
  const resolved = TOOL_ALIAS[name] ?? name;
  switch (resolved) {
    case "search_eligible_offers": {
      const conv = await prisma.conversation.findUnique({ where: { id: ctx.conversationId } });
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: ctx.leadId } });
      const ranking = await selectOffers({
        city: (args.city as string) || lead.city,
        users: (args.users as number) || 3,
        need: (args.need as string) || lead.productInterest,
        conversationChannel: conv?.channel,
        category: (args.category as string) || undefined,
        streaming: (args.streaming as string) || undefined,
        maxPriceCents: args.budget != null ? Number(args.budget) * (Number(args.budget) < 1000 ? 100 : 1) : undefined,
        acquisitionType: args.acquisition_type as never,
        wantsChip: /chip|movel|móvel/i.test(String(args.query ?? args.need ?? "")),
        viabilityReliable: true,
      });
      const offers = [ranking.best_offer, ranking.alternative_offer, ranking.upsell, ranking.cross_sell].filter(Boolean);
      if (ranking.best_offer) {
        await transitionLead(ctx.leadId, "OFERTA_APRESENTADA", ranking.best_offer.id);
        await emit("OFFER_PRESENTED", ctx.leadId, { offerId: ranking.best_offer.id });
        await prisma.offerPresentation.create({
          data: {
            conversationId: ctx.conversationId,
            offerId: ranking.best_offer.id,
            snapshot: {
              name: ranking.best_offer.name,
              priceCents: ranking.best_offer.promotionalPriceCents ?? ranking.best_offer.priceCents,
              speedMbps: ranking.best_offer.speedMbps,
              benefits: ranking.best_offer.benefits,
              loyalty: ranking.best_offer.loyalty,
            },
          },
        });
      }
      const { toCustomerOffer } = await import("@/offer-engine/customer-view");
      return {
        offers: offers.map((o) => toCustomerOffer(o!)),
        reasoning_metadata: ranking.reasoning_metadata,
        policy: "somente ofertas aprovadas do book ACTIVE",
      };
    }
    case "get_offer_details": {
      const offer = await prisma.offer.findFirst({
        where: { id: String(args.offerId), status: "APROVADA" },
      });
      if (!offer) return { error: "oferta_nao_aprovada_ou_inexistente" };
      const { toCustomerOffer } = await import("@/offer-engine/customer-view");
      return { offer: toCustomerOffer(offer) };
    }
    case "check_viability": {
      const { runViabilityForLead } = await import("@/domain/viability");
      return runViabilityForLead(ctx.leadId, {
        address: args.address as string | undefined,
        zipCode: args.zipCode as string | undefined,
        city: args.city as string | undefined,
        neighborhood: args.neighborhood as string | undefined,
        latitude: args.latitude as number | undefined,
        longitude: args.longitude as number | undefined,
      });
    }
    case "get_customer_context": {
      const lead = await prisma.lead.findUnique({
        where: { id: ctx.leadId },
        include: { customer: true, consents: true, facts: true },
      });
      const conv = await prisma.conversation.findUnique({
        where: { id: ctx.conversationId },
        include: { memory: true },
      });
      const cpfCollected = Boolean(lead?.customer?.documentCpf || lead?.customer?.documentCpfEncrypted);
      const { cpfPromptSafe } = await import("@/lib/cpf");
      return {
        lead: lead
          ? {
              ...lead,
              customer: lead.customer
                ? {
                    id: lead.customer.id,
                    fullName: lead.customer.fullName,
                    email: lead.customer.email,
                    phone: lead.customer.phone,
                    ...cpfPromptSafe(cpfCollected, cpfCollected),
                  }
                : null,
            }
          : null,
        salesStage: conv?.salesStage,
        memory: conv?.memory?.customerFacts,
      };
    }
    case "update_customer_fact": {
      if (!args.key) {
        const results = [];
        for (const key of ["name", "city", "neighborhood", "address", "zipCode", "productInterest"] as const) {
          if (args[key]) {
            results.push(await runTool("update_customer_fact", { key, value: args[key] }, ctx));
          }
        }
        return results.length ? { facts: results as unknown[] } : { error: "fato_incompleto" };
      }
      const key = String(args.key ?? "").trim();
      const value = String(args.value ?? "").trim();
      if (!key || !value) return { error: "fato_incompleto" };
      const leadPatch: Record<string, string> = {};
      if (["name", "nome"].includes(key)) leadPatch.name = value;
      if (["city", "cidade"].includes(key)) leadPatch.city = value;
      if (["neighborhood", "bairro"].includes(key)) leadPatch.neighborhood = value;
      if (["address", "endereco"].includes(key)) leadPatch.address = value;
      if (["zipCode", "cep"].includes(key)) leadPatch.zipCode = value;
      if (["productInterest", "product_interest", "interesse"].includes(key)) leadPatch.productInterest = value;
      if (Object.keys(leadPatch).length) {
        await prisma.lead.update({ where: { id: ctx.leadId }, data: leadPatch });
      }
      await prisma.customerFact.upsert({
        where: { leadId_key: { leadId: ctx.leadId, key } },
        update: { value },
        create: { leadId: ctx.leadId, key, value, source: "conversation" },
      });
      const { refreshConversationMemory } = await import("@/ai/memory");
      await refreshConversationMemory(ctx.conversationId, { [key]: value } as never);
      return { ok: true, key, value };
    }
    case "set_sales_stage": {
      const { setSalesStage } = await import("@/ai/orchestrator");
      const stage = String(args.stage ?? args.status ?? "");
      if (stage) {
        await setSalesStage(ctx.conversationId, stage as never, String(args.reason ?? "tool"), "AI");
      }
      const status = (args.status as LeadStatus) || undefined;
      if (!status) return { stage };
      const allowed: LeadStatus[] = [
        "EM_ATENDIMENTO_IA",
        "QUALIFICANDO",
        "CONSULTANDO_VIABILIDADE",
        "OFERTA_APRESENTADA",
        "NEGOCIANDO",
        "ACEITE_COMERCIAL",
        "COLETANDO_DADOS",
        "PERDIDO",
      ];
      if (!allowed.includes(status)) {
        return { error: "status_nao_permitido_pela_ia" };
      }
      await transitionLead(ctx.leadId, status, (args.reason as string) || "sales_agent");
      return { status };
    }
    case "create_pre_sale": {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: ctx.leadId } });
      let offerId = args.offerId as string | undefined;
      if (!offerId) {
        const ranking = await selectOffers({ city: lead.city, need: lead.productInterest });
        offerId = ranking.best_offer?.id;
      }
      if (!offerId) return { error: "nenhuma_oferta_aprovada" };
      const offer = await prisma.offer.findFirst({ where: { id: offerId, status: "APROVADA" } });
      if (!offer) return { error: "oferta_nao_aprovada" };
      const consents = await prisma.consent.findMany({ where: { leadId: ctx.leadId } });
      const summary = `Cliente ${lead.name ?? lead.phone} em ${lead.city ?? "cidade não informada"} aceitou ${offer.name} (${offer.speedMbps ?? "—"} Mega). Preço vigente: ${formatBRL(offer.promotionalPriceCents ?? offer.priceCents)}.`;
      try {
        const preSale = await createPreSale({
          leadId: ctx.leadId,
          offerId: offer.id,
          address: lead.address ?? undefined,
          aiSummary: summary,
          consentsSnapshot: consents,
        });
        await emit("CUSTOMER_ACCEPTED", ctx.leadId, { offerId: offer.id });
        return { preSale };
      } catch (error) {
        return { error: error instanceof Error ? error.message : "presale_recusada" };
      }
    }
    case "register_buying_intent": {
      await emit("BUYING_INTENT_DETECTED", ctx.leadId, { offerId: args.offerId, notes: args.notes });
      await transitionLead(ctx.leadId, "NEGOCIANDO", "buying_intent");
      const { setSalesStage } = await import("@/ai/orchestrator");
      await setSalesStage(ctx.conversationId, "BUYING_INTENT", "tool", "AI");
      return { ok: true, stop_selling: false };
    }
    case "get_sales_conversation_state": {
      const { loadSalesConversationState } = await import("@/sales/persist-state");
      const { compactSalesStateForPrompt } = await import("@/sales/conversation-state");
      const state = await loadSalesConversationState(ctx.conversationId);
      return { state: compactSalesStateForPrompt(state) };
    }
    case "check_city_availability": {
      const city = String(args.city ?? "").trim();
      const books = await prisma.offerBook.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
      const offers = await prisma.offer.findMany({
        where: {
          status: "APROVADA",
          ...(books.length ? { bookId: { in: books.map((b) => b.id) } } : {}),
        },
        select: { city: true, region: true, name: true, categoryNormalized: true },
      });
      const cities = [...new Set(offers.flatMap((o) => [o.city, o.region].filter(Boolean)))] as string[];
      const { cityMatches } = await import("@/offer-engine/eligibility");
      const matched = city
        ? offers.filter((o) => cityMatches(o.city, o.region, city))
        : [];
      return {
        city: city || null,
        available: city ? matched.length > 0 : false,
        matching_offers: matched.length,
        book_cities: cities,
        policy: "somente book ACTIVE / ofertas APROVADAS",
      };
    }
    case "get_portability_info": {
      const { loadSalesConversationState } = await import("@/sales/persist-state");
      const state = await loadSalesConversationState(ctx.conversationId);
      const docs = await retrieveKnowledge(String(args.query ?? "portabilidade"), [
        "FAQ",
        "POLITICAS",
        "REGRAS_COMERCIAIS",
        "PROCEDIMENTOS",
      ]);
      return {
        lead: {
          operadora_atual: state.operadora_atual,
          portabilidade: state.portabilidade,
          ddd_origem: state.ddd_origem,
        },
        rules: docs.map((d) => ({ title: d.title, content: d.content.slice(0, 500) })),
        policy: "sem inventar prazo ou taxa de portabilidade",
      };
    }
    case "get_sale_status": {
      const conv = await prisma.conversation.findUnique({
        where: { id: ctx.conversationId },
        include: {
          lead: { include: { acceptances: true, preSales: true } },
          handoffs: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
      return {
        salesStage: conv?.salesStage,
        aiEnabled: conv?.aiEnabled,
        status: conv?.status,
        acceptance: conv?.lead.acceptances[0] ?? null,
        preSale: conv?.lead.preSales[0] ?? null,
        last_handoff: conv?.handoffs[0]
          ? { reason: conv.handoffs[0].reason, notes: conv.handoffs[0].notes, status: conv.handoffs[0].status }
          : null,
      };
    }
    case "get_documentation_requirements": {
      const productType = String(args.productType ?? "fibra");
      const defs = await prisma.requiredFieldDefinition.findMany({
        where: { productType, required: true },
      });
      return {
        fields: defs.map((d) => ({ key: d.fieldKey, label: d.label })),
        policy: "somente campos cadastrados; peça um por vez",
      };
    }
    case "request_human_handoff": {
      const { loadSalesConversationState } = await import("@/sales/persist-state");
      const sales = await loadSalesConversationState(ctx.conversationId);
      const inbound = await prisma.message.findFirst({
        where: { conversationId: ctx.conversationId, direction: "INBOUND" },
        orderBy: { createdAt: "desc" },
      });
      const asked =
        sales.handoff_required ||
        /atendente|humano|operador|pessoa de verdade/i.test(inbound?.body ?? "");
      const rawReason = String(args.reason ?? "");
      const allowedNow =
        asked ||
        ["RECLAMACAO", "CASO_SENSIVEL", "FALHA_VIABILIDADE", "EXCECAO_COMERCIAL", "INFORMACAO_NAO_ENCONTRADA"].includes(
          rawReason,
        );
      if (!allowedNow) {
        return {
          handoff: false,
          error: "handoff_nao_autorizado",
          hint: "Cliente ter respondido não pausa a IA. Continue com ferramentas e o estado do lead.",
        };
      }
      await prisma.conversation.update({
        where: { id: ctx.conversationId },
        data: { status: "HANDOFF_HUMANO", aiEnabled: false, salesStage: "HUMAN_HANDOFF" },
      });
      const allowed: HandoffReason[] = [
        "CLIENTE_SOLICITOU",
        "IA_SEM_CONFIANCA",
        "INFORMACAO_NAO_ENCONTRADA",
        "RECLAMACAO",
        "CASO_SENSIVEL",
        "FALHA_VIABILIDADE",
        "EXCECAO_COMERCIAL",
        "FALHA_REPETIDA_IA",
      ];
      const raw = String(args.reason ?? "");
      const reason = (allowed.includes(raw as HandoffReason) ? raw : "INFORMACAO_NAO_ENCONTRADA") as HandoffReason;
      const notes = [args.notes, allowed.includes(raw as HandoffReason) ? null : rawReason]
        .filter(Boolean)
        .join(" — ")
        .slice(0, 400);
      await prisma.humanHandoff.create({
        data: {
          conversationId: ctx.conversationId,
          reason,
          notes: notes || undefined,
        },
      });
      await prisma.message.create({
        data: {
          conversationId: ctx.conversationId,
          direction: "OUTBOUND",
          actor: "SYSTEM",
          body: "Não tenho essa informação com segurança. Um atendente assume a conversa.",
          status: "SENT",
        },
      });
      return { handoff: true, reason };
    }
    case "get_faq": {
      const docs = await retrieveKnowledge(String(args.query), ["FAQ", "POLITICAS", "PROCEDIMENTOS", "REGRAS_COMERCIAIS"]);
      if (!docs.length) {
        return { blocked: true, reason: "conhecimento_nao_encontrado" };
      }
      return {
        faq: docs.map((d) => `Fonte ${d.type} v${d.version}: ${d.title}\n${d.content}`).join("\n\n"),
        knowledge_source: docs.map((d) => d.id).join(","),
      };
    }
    case "register_objection": {
      const category = classifyObjection(String(args.category || args.text || ""));
      const playbook = await prisma.objectionPlaybook.findFirst({
        where: { category, active: true },
      });
      await prisma.objection.create({
        data: {
          leadId: ctx.leadId,
          category,
          text: String(args.text ?? ""),
          response: null,
          result: "registrada",
        },
      });
      await transitionLead(ctx.leadId, "NEGOCIANDO", category);
      const { getObjectionContext } = await import("@/commercial/objection-engine");
      const structured = await getObjectionContext(ctx.conversationId, category);
      return {
        category,
        allowed_arguments: structured.allowed_arguments,
        forbidden_claims: structured.forbidden_claims,
        commercial_goal: structured.commercial_goal,
        playbook_note: playbook?.argument ?? null,
      };
    }
    case "get_objection_context": {
      const { getObjectionContext } = await import("@/commercial/objection-engine");
      return (await getObjectionContext(ctx.conversationId, args.objection_type as string | undefined)) as unknown as Record<string, unknown>;
    }
    case "compare_offers": {
      const ids = (Array.isArray(args.offerIds) ? args.offerIds : [args.offerIdA, args.offerIdB]).filter(Boolean).map(String);
      const found = await prisma.offer.findMany({ where: { id: { in: ids }, status: "APROVADA" } });
      if (found.length < 2) return { error: "oferta_nao_aprovada" };
      const { toCustomerOffer } = await import("@/offer-engine/customer-view");
      const views = found.map((o) => toCustomerOffer(o));
      return {
        comparison: views.map((o) => ({
          id: o.id,
          name: o.name,
          price: o.promotionalPriceCents,
          promotion: o.pricingPeriodDescription,
          post_promotion_price: o.futurePriceCents,
          speedMbps: o.speedMbps,
          mobileDataGb: o.mobileDataGb,
          streaming: o.includedStreaming,
          apps: o.unlimitedApps,
          benefits: o.benefits,
        })),
        differences: views.length === 2
          ? {
              priceDelta: (views[0].promotionalPriceCents ?? 0) - (views[1].promotionalPriceCents ?? 0),
              speedDelta: (views[0].speedMbps ?? 0) - (views[1].speedMbps ?? 0),
              streaming: [views[0].includedStreaming.map((s) => s.provider), views[1].includedStreaming.map((s) => s.provider)],
            }
          : null,
      };
    }
    case "get_product_knowledge": {
      const { retrieveProductKnowledge } = await import("@/commercial/product-knowledge");
      const docs = await retrieveProductKnowledge(String(args.query ?? ""), 5);
      return { knowledge: docs, policy: "somente book ACTIVE aprovado" };
    }
    case "register_commercial_acceptance": {
      const presented = await prisma.offerPresentation.findFirst({
        where: { conversationId: ctx.conversationId, offerId: String(args.offerId ?? "") },
      });
      let offerId = args.offerId as string | undefined;
      if (!offerId) {
        const last = await prisma.offerPresentation.findFirst({
          where: { conversationId: ctx.conversationId },
          orderBy: { createdAt: "desc" },
        });
        offerId = last?.offerId;
      }
      if (!offerId) return { error: "oferta_nao_apresentada" };
      const offer = await prisma.offer.findFirst({ where: { id: offerId, status: "APROVADA" } });
      if (!offer) return { error: "oferta_nao_aprovada" };
      if (offer.endsAt && offer.endsAt < new Date()) return { error: "oferta_fora_da_vigencia" };
      await prisma.commercialAcceptance.create({
        data: { leadId: ctx.leadId, offerId: offer.id, offerSnapshot: presented?.snapshot ?? { name: offer.name, priceCents: offer.promotionalPriceCents ?? offer.priceCents } },
      });
      const { setSalesStage } = await import("@/ai/orchestrator");
      await setSalesStage(ctx.conversationId, "COMMERCIAL_ACCEPTANCE", "acceptance", "AI");
      await transitionLead(ctx.leadId, "ACEITE_COMERCIAL", "aceite");
      await emit("COMMERCIAL_ACCEPTED", ctx.leadId, { offerId: offer.id });
      return { accepted: true, offerId: offer.id, stop_selling: true };
    }
    case "get_required_customer_fields": {
      const defs = await prisma.requiredFieldDefinition.findMany({ where: { productType: "fibra", required: true } });
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: ctx.leadId }, include: { customer: true } });
      const have: Record<string, boolean> = {
        FULL_NAME: Boolean(lead.name || lead.customer?.fullName),
        CPF: Boolean(lead.customer?.documentCpf || lead.customer?.documentCpfEncrypted),
        EMAIL: Boolean(lead.customer?.email),
        PHONE: Boolean(lead.phone),
        CEP: Boolean(lead.zipCode),
        ADDRESS: Boolean(lead.address),
        NEIGHBORHOOD: Boolean(lead.neighborhood),
        CITY: Boolean(lead.city),
      };
      const missing = (defs.length ? defs.map((d) => d.fieldKey) : Object.keys(have)).filter((k) => !have[k]);
      const askNow = missing.slice(0, 1);
      return {
        next_field: askNow[0] ?? null,
        missing: askNow,
        remaining: missing.length,
        hint: "pergunte só next_field; no máximo um grupo pequeno; nunca a lista inteira",
      };
    }
    case "save_customer_field": {
      const field = String(args.field ?? "").toUpperCase();
      const value = String(args.value ?? "");
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: ctx.leadId } });
      if (field === "CPF") {
        const { isValidCpf, encryptCpf, normalizeCpf, maskCpf } = await import("@/lib/cpf");
        const ok = isValidCpf(value);
        if (!ok) return { error: "cpf_invalido", cpf_valid: false };
        const phone = lead.phone;
        await prisma.customer.upsert({
          where: { phone },
          update: { documentCpf: maskCpf(normalizeCpf(value)), documentCpfEncrypted: encryptCpf(value) },
          create: { phone, documentCpf: maskCpf(normalizeCpf(value)), documentCpfEncrypted: encryptCpf(value) },
        });
        return { ok: true, cpf_collected: true, cpf_valid: true };
      }
      const map: Record<string, object> = {
        FULL_NAME: { name: value },
        CITY: { city: value },
        ADDRESS: { address: value },
        CEP: { zipCode: value },
        NEIGHBORHOOD: { neighborhood: value },
      };
      if (map[field]) await prisma.lead.update({ where: { id: ctx.leadId }, data: map[field] });
      if (["ADDRESS", "CEP", "CITY", "NEIGHBORHOOD"].includes(field)) {
        const { runViabilityForLead } = await import("@/domain/viability");
        const fresh = await prisma.lead.findUniqueOrThrow({ where: { id: ctx.leadId } });
        if (fresh.address || fresh.zipCode) {
          await runViabilityForLead(ctx.leadId);
        }
      }
      if (field === "EMAIL") {
        await prisma.customer.upsert({
          where: { phone: lead.phone },
          update: { email: value },
          create: { phone: lead.phone, email: value },
        });
      }
      const { enqueueLaunchIfCustomerReady } = await import("@/domain/launch-ready");
      let queued = { preSaleId: null as string | null, created: false };
      try {
        queued = await enqueueLaunchIfCustomerReady(ctx.leadId);
      } catch {
        queued = { preSaleId: null, created: false };
      }
      return { ok: true, field, ready_for_operator_launch: queued.created || Boolean(queued.preSaleId) };
    }
    case "get_business_rule": {
      const docs = await retrieveKnowledge(String(args.query), ["REGRAS_COMERCIAIS", "POLITICAS"]);
      return { rules: docs.map((d) => ({ title: d.title, content: d.content.slice(0, 600) })) };
    }
    case "register_loss_reason": {
      await prisma.lead.update({
        where: { id: ctx.leadId },
        data: { lostReason: String(args.reason) },
      });
      await transitionLead(ctx.leadId, "PERDIDO", String(args.reason));
      return { lost: true };
    }
    default:
      return { error: "tool_desconhecida" };
  }
}

function classifyObjection(text: string): ObjectionCategory {
  return taxonomyToPrisma(classifyObjectionTaxonomy(text));
}

function formatBRL(cents?: number | null) {
  if (cents == null) return "não informado na oferta";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
