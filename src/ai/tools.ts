import { prisma } from "@/lib/prisma";
import { selectOffers } from "@/offer-engine/select";
import { getViabilityProvider } from "@/integrations/viability/provider";
import { createPreSale } from "@/domain/presale";
import { transitionLead } from "@/domain/leads";
import { retrieveKnowledge } from "@/ai/rag";
import { emit } from "@/events/bus";
import type { HandoffReason, LeadStatus, ObjectionCategory } from "@prisma/client";

export const SALES_TOOLS = [
  {
    name: "search_offers",
    description: "Busca somente ofertas APROVADAS e vigentes. Nunca inventa preço.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" }, city: { type: "string" }, users: { type: "number" } },
    },
  },
  {
    name: "get_offer",
    description: "Obtém uma oferta aprovada pelo id.",
    parameters: { type: "object", properties: { offerId: { type: "string" } }, required: ["offerId"] },
  },
  {
    name: "check_viability",
    description: "Consulta viabilidade. Nunca afirmar VIAVEL sem fonte confiável.",
    parameters: {
      type: "object",
      properties: {
        address: { type: "string" },
        zipCode: { type: "string" },
        city: { type: "string" },
        neighborhood: { type: "string" },
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
    description: "Transfere para humano e bloqueia a IA.",
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
] as const;

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { leadId: string; conversationId: string },
) {
  switch (name) {
    case "search_offers": {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: ctx.leadId } });
      const ranking = await selectOffers({
        city: (args.city as string) || lead.city,
        users: (args.users as number) || 3,
        need: lead.productInterest,
        viabilityReliable: true,
      });
      const offers = [ranking.best_offer, ranking.alternative_offer, ranking.upsell, ranking.cross_sell].filter(Boolean);
      if (ranking.best_offer) {
        await transitionLead(ctx.leadId, "OFERTA_APRESENTADA", ranking.best_offer.id);
        await emit("OFFER_PRESENTED", ctx.leadId, { offerId: ranking.best_offer.id });
      }
      return {
        offers,
        reasoning_metadata: ranking.reasoning_metadata,
        policy: "somente ofertas aprovadas",
      };
    }
    case "get_offer": {
      const offer = await prisma.offer.findFirst({
        where: { id: String(args.offerId), status: "APROVADA" },
      });
      if (!offer) return { error: "oferta_nao_aprovada_ou_inexistente" };
      return { offer };
    }
    case "check_viability": {
      await transitionLead(ctx.leadId, "CONSULTANDO_VIABILIDADE", "tool");
      const provider = getViabilityProvider();
      const result = await provider.check({
        address: args.address as string | undefined,
        zipCode: args.zipCode as string | undefined,
        city: args.city as string | undefined,
        neighborhood: args.neighborhood as string | undefined,
      });
      await prisma.viabilityCheck.create({
        data: {
          leadId: ctx.leadId,
          address: args.address as string | undefined,
          zipCode: args.zipCode as string | undefined,
          city: args.city as string | undefined,
          neighborhood: args.neighborhood as string | undefined,
          result: result.result,
          source: result.source,
          details: result.details as object,
        },
      });
      if (args.city) {
        await prisma.lead.update({
          where: { id: ctx.leadId },
          data: {
            city: String(args.city),
            address: (args.address as string) || undefined,
            zipCode: args.zipCode as string | undefined,
            neighborhood: args.neighborhood as string | undefined,
          },
        });
      }
      await emit("VIABILITY_CHECKED", ctx.leadId, { result: result.result, source: result.source });
      return { viability: { ...result, city: args.city } };
    }
    case "get_customer": {
      const lead = await prisma.lead.findUnique({
        where: { id: ctx.leadId },
        include: { customer: true, consents: true },
      });
      return { lead };
    }
    case "update_customer": {
      const data: Record<string, unknown> = {};
      for (const key of ["name", "city", "neighborhood", "address", "zipCode", "productInterest"] as const) {
        if (args[key]) data[key] = args[key];
      }
      const lead = await prisma.lead.update({ where: { id: ctx.leadId }, data });
      return { lead };
    }
    case "update_lead_stage": {
      const status = args.status as LeadStatus;
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
      const preSale = await createPreSale({
        leadId: ctx.leadId,
        offerId: offer.id,
        address: lead.address ?? undefined,
        aiSummary: summary,
        consentsSnapshot: consents,
      });
      await emit("CUSTOMER_ACCEPTED", ctx.leadId, { offerId: offer.id });
      return { preSale };
    }
    case "request_human": {
      await prisma.conversation.update({
        where: { id: ctx.conversationId },
        data: { status: "HANDOFF_HUMANO" },
      });
      const reason = (args.reason as HandoffReason) || "IA_SEM_CONFIANCA";
      await prisma.humanHandoff.create({
        data: {
          conversationId: ctx.conversationId,
          reason,
          notes: args.notes as string | undefined,
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
          response: playbook?.argument,
          result: "respondida",
        },
      });
      await transitionLead(ctx.leadId, "NEGOCIANDO", category);
      if (!playbook) {
        return { blocked: true, reason: "sem_argumento_aprovado" };
      }
      return { objectionResponse: playbook.argument, category };
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
  const t = text.toLowerCase();
  if (/preço|preco|caro|valor/.test(t)) return "PRECO";
  if (/pensar|depois/.test(t)) return "VAI_PENSAR";
  if (/vivo|claro|tim|oi|concorr/.test(t)) return "CONCORRENTE";
  if (/fidel/.test(t)) return "FIDELIDADE";
  if (/instala/.test(t)) return "INSTALACAO";
  if (/família|familia|esposo|esposa/.test(t)) return "CONVERSAR_COM_FAMILIA";
  if (/já tenho|ja tenho/.test(t)) return "JA_POSSUI_INTERNET";
  if (/portab/.test(t)) return "PORTABILIDADE";
  if (/não quero|nao quero|sem interesse/.test(t)) return "SEM_INTERESSE";
  return "OUTROS";
}

function formatBRL(cents?: number | null) {
  if (cents == null) return "não informado na oferta";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
