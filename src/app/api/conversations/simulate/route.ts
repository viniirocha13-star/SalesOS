import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { createLead } from "@/domain/leads";

export async function POST(req: Request) {
  try {
    await requirePermission("conversations.simulate");
    let labStack = "terra_sol";
    try {
      const body = (await req.json()) as { labStack?: string };
      if (body.labStack === "luna" || body.labStack === "terra" || body.labStack === "terra_sol") {
        labStack = body.labStack;
      }
    } catch {
      /* empty body */
    }
    const phone = `8599${Math.floor(10000000 + Math.random() * 89999999)}`;
    const lead = await createLead({
      phone,
      origin: "OUTROS",
      source: "simulator",
    });
    const conv = await prisma.conversation.create({
      data: { leadId: lead.id, channel: "SIMULATOR", status: "IA_ATIVA" },
    });
    await prisma.conversationMemory.create({
      data: {
        conversationId: conv.id,
        customerFacts: { lab_stack: labStack },
      },
    });
    return NextResponse.json({ id: conv.id, labStack });
  } catch (error) {
    return errorResponse(error);
  }
}
