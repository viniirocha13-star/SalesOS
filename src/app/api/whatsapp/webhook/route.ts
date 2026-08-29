import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createLead } from "@/domain/leads";
import { handleInboundMessage } from "@/ai/sales-agent";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "wa";
  if (!rateLimit(`wa:${ip}`, 120, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json();
  await prisma.whatsAppLog.create({
    data: { direction: "INBOUND", payload: redact(body) },
  });

  const messages = extractMessages(body);
  for (const msg of messages) {
    if (msg.id) {
      const dup = await prisma.message.findUnique({ where: { waMessageId: msg.id } });
      if (dup) continue;
    }
    let lead = await prisma.lead.findFirst({ where: { phone: msg.from.replace(/\D/g, "") } });
    if (!lead) {
      lead = await createLead({ phone: msg.from, origin: "OUTROS", source: "whatsapp" });
    }
    let conv = await prisma.conversation.findFirst({
      where: { leadId: lead.id, channel: "WHATSAPP" },
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { leadId: lead.id, channel: "WHATSAPP", waConversationId: msg.from },
      });
    }
    if (msg.text) {
      if (msg.id) {
        const dup = await prisma.message.findFirst({ where: { waMessageId: msg.id } });
        if (dup) continue;
      }
      await handleInboundMessage({ conversationId: conv.id, body: msg.text, fromChannel: "WHATSAPP" });
    }
  }

  return NextResponse.json({ ok: true });
}

function extractMessages(body: unknown): { id?: string; from: string; text?: string }[] {
  const entry = (body as { entry?: { changes?: { value?: { messages?: { id: string; from: string; text?: { body: string } }[] } }[] }[] })
    ?.entry;
  const list = entry?.[0]?.changes?.[0]?.value?.messages ?? [];
  return list.map((m) => ({ id: m.id, from: m.from, text: m.text?.body }));
}

function redact(value: unknown) {
  const raw = JSON.stringify(value);
  return JSON.parse(raw.replace(/\d{8,}/g, "[redacted]"));
}
