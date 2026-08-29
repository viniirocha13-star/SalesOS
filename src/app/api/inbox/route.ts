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
    const rows = await prisma.conversation.findMany({
      where,
      include: { lead: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { lastMessageAt: "desc" },
      take: 80,
    });
    const sensitive = can(user.role, "view_sensitive_data");
    return NextResponse.json({
      conversations: rows.map((c) => ({
        id: c.id,
        name: c.lead.name,
        phone: sensitive ? c.lead.phone : maskPhone(c.lead.phone),
        city: c.lead.city,
        preview: c.messages[0]?.body?.slice(0, 80) ?? "",
        at: c.lastMessageAt,
        unread: c.unreadCount,
        stage: c.salesStage,
        status: c.status,
        aiEnabled: c.aiEnabled,
        score: c.lead.score,
        channel: c.channel,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
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
