import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { maskPhone } from "@/lib/pii";
import { can } from "@/lib/rbac";
import type { ConversationStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("conversations.view");
    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") ?? "all";
    const where = inboxWhere(filter);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [rows, startedToday, aiRepliesToday, handoffsToday, negotiations, salesToday, decisions] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          lead: { include: { facts: true, customer: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          handoffs: { where: { status: { in: ["ABERTO", "EM_ATENDIMENTO"] } }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 80,
      }),
      prisma.conversation.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.message.count({ where: { actor: "AI", createdAt: { gte: startOfDay } } }),
      prisma.humanHandoff.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.conversation.count({ where: { salesStage: { in: ["NEGOTIATION", "OBJECTION_HANDLING", "BUYING_INTENT"] } } }),
      prisma.sale.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.commercialDecision.aggregate({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
        _avg: { latencyMs: true },
        _count: true,
      }),
    ]);
    const sensitive = can(user.role, "view_sensitive_data");
    const conversations = rows.map((c) => {
      const last = c.messages[0];
      const dataFlags = collectDataFlags(c.lead);
      const lane = classifyLane({
        aiEnabled: c.aiEnabled,
        status: c.status,
        lastActor: last?.actor ?? null,
        dataFlags,
        salesStage: c.salesStage,
      });
      return {
        id: c.id,
        name: c.lead.name,
        phone: sensitive ? c.lead.phone : maskPhone(c.lead.phone),
        city: c.lead.city,
        preview: last?.body?.slice(0, 90) ?? "",
        at: c.lastMessageAt ?? last?.createdAt ?? c.createdAt,
        unread: c.unreadCount,
        stage: c.salesStage,
        status: c.status,
        aiEnabled: c.aiEnabled,
        score: c.lead.score,
        channel: c.channel,
        lastActor: last?.actor ?? null,
        dataFlags,
        lane,
        handoffReason: c.handoffs[0]?.reason ?? null,
      };
    });
    const lanes = {
      arriving: conversations.filter((c) => c.lane === "arriving").length,
      waiting_ai: conversations.filter((c) => c.lane === "waiting_ai").length,
      waiting_human: conversations.filter((c) => c.lane === "waiting_human").length,
      with_data: conversations.filter((c) => c.lane === "with_data").length,
    };
    const avgMs = decisions._avg.latencyMs ?? 0;
    return NextResponse.json({
      conversations,
      stats: {
        ...lanes,
        startedToday,
        aiRepliesToday,
        handoffsToday,
        negotiations,
        salesToday,
        avgLatencySec: avgMs ? Number((avgMs / 1000).toFixed(1)) : 0,
        aiSuccessPct: conversations.length
          ? Math.round((conversations.filter((c) => c.aiEnabled && c.status === "IA_ATIVA").length / conversations.length) * 100)
          : 0,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function collectDataFlags(lead: {
  phone: string;
  address: string | null;
  zipCode: string | null;
  customer: { email: string | null; documentCpf: string | null; documentCpfEncrypted: string | null } | null;
  facts: { key: string }[];
}) {
  const flags: string[] = [];
  if (lead.phone) flags.push("Telefone");
  if (lead.customer?.documentCpf || lead.customer?.documentCpfEncrypted || lead.facts.some((f) => f.key === "cpf")) flags.push("CPF");
  if (lead.customer?.email || lead.facts.some((f) => f.key === "email")) flags.push("Email");
  if (lead.address || lead.zipCode) flags.push("Endereço");
  return flags;
}

function classifyLane(input: {
  aiEnabled: boolean;
  status: string;
  lastActor: string | null;
  dataFlags: string[];
  salesStage: string;
}) {
  if (!input.aiEnabled || input.status === "HANDOFF_HUMANO") return "waiting_human";
  if (input.dataFlags.includes("CPF") || input.dataFlags.includes("Endereço") || input.salesStage === "DATA_COLLECTION") {
    return "with_data";
  }
  if (input.lastActor === "CUSTOMER" && input.aiEnabled) return "waiting_ai";
  return "arriving";
}

function inboxWhere(filter: string): { status?: ConversationStatus; aiEnabled?: boolean; salesStage?: { in: never[] } } | object {
  switch (filter) {
    case "ai":
      return { aiEnabled: true, status: "IA_ATIVA" };
    case "human":
      return { aiEnabled: false };
    case "new":
      return { salesStage: "NEW" };
    case "negotiating":
      return { salesStage: { in: ["NEGOTIATION", "OBJECTION_HANDLING", "OFFER_PRESENTATION"] } };
    case "presale":
      return { salesStage: { in: ["PRE_SALE_READY", "WAITING_OPERATOR"] } };
    case "pending":
      return { salesStage: "OPERATOR_PENDING" };
    case "waiting":
      return { salesStage: { in: ["OFFER_PRESENTATION", "DATA_COLLECTION"] } };
    case "done":
      return { status: "ENCERRADA" };
    default:
      return {};
  }
}
