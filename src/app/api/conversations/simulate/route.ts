import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { createLead } from "@/domain/leads";

export async function POST() {
  try {
    await requirePermission("conversations.simulate");
    const phone = `8599${Math.floor(10000000 + Math.random() * 89999999)}`;
    const lead = await createLead({
      name: "Lead simulador",
      phone,
      origin: "OUTROS",
      source: "simulator",
    });
    const conv = await prisma.conversation.create({
      data: { leadId: lead.id, channel: "SIMULATOR", status: "IA_ATIVA" },
    });
    return NextResponse.json({ id: conv.id });
  } catch (error) {
    return errorResponse(error);
  }
}
