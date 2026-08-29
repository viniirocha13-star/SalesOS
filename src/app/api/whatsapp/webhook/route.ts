import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLead } from "@/domain/leads";
import { enqueueInbound } from "@/workers/queue";
import { rateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { maskForLog } from "@/lib/pii";

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
  if (!rateLimit(`wa:${ip}`, 240, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const raw = await request.text();
  if (!verifySignature(request, raw)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const events = extractEvents(body);
  for (const event of events) {
    try {
      await persistAndEnqueue(event);
    } catch (error) {
      logError("webhook.event_failed", { message: String(error) });
    }
  }

  return NextResponse.json({ ok: true });
}

function verifySignature(request: Request, raw: string) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("x-hub-signature-256") ?? "";
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

type WaEvent = {
  id: string;
  from?: string;
  type: string;
  text?: string;
  mediaId?: string;
  lat?: number;
  lng?: number;
  status?: string;
  recipient?: string;
};

async function persistAndEnqueue(event: WaEvent) {
  await prisma.whatsAppInboundEvent.upsert({
    where: { providerEventId: event.id },
    create: { providerEventId: event.id, payload: maskForLog(event) as object },
    update: {},
  });
  const existing = await prisma.whatsAppInboundEvent.findUnique({ where: { providerEventId: event.id } });
  if (existing?.processedAt) return;

  if (event.status && event.recipient) {
    await prisma.message.updateMany({
      where: { OR: [{ waMessageId: event.id }, { providerMessageId: event.id }] },
      data: {
        status:
          event.status === "read"
            ? "READ"
            : event.status === "delivered"
              ? "DELIVERED"
              : event.status === "failed"
                ? "FAILED"
                : "SENT",
      },
    });
    await prisma.whatsAppInboundEvent.update({
      where: { providerEventId: event.id },
      data: { processedAt: new Date() },
    });
    return;
  }

  if (!event.from) return;
  const phone = event.from.replace(/\D/g, "");
  let lead = await prisma.lead.findFirst({ where: { phone } });
  if (!lead) lead = await createLead({ phone, origin: "OUTROS", source: "whatsapp" });
  let conv = await prisma.conversation.findFirst({ where: { leadId: lead.id, channel: "WHATSAPP" } });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { leadId: lead.id, channel: "WHATSAPP", waConversationId: event.from, salesStage: "GREETING" },
    });
  }

  const body = event.text || (event.type === "location" ? `Localização: ${event.lat},${event.lng}` : `[${event.type}]`);
  const dup = event.id ? await prisma.message.findUnique({ where: { waMessageId: event.id } }) : null;
  if (!dup) {
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: "INBOUND",
        actor: "CUSTOMER",
        body,
        waMessageId: event.id,
        wamid: event.id,
        idempotencyKey: event.id,
        buffered: true,
        status: "RECEIVED",
        mediaType: event.type !== "text" ? event.type : undefined,
      },
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });
  }

  await enqueueInbound(conv.id);
  await prisma.whatsAppInboundEvent.update({
    where: { providerEventId: event.id },
    data: { processedAt: new Date() },
  });
  logInfo("webhook.enqueued", { type: event.type });
}

function extractEvents(body: unknown): WaEvent[] {
  const out: WaEvent[] = [];
  const entries = (body as { entry?: { changes?: { value?: Record<string, unknown> }[] }[] })?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const messages = (value.messages as { id: string; from: string; type: string; text?: { body: string }; location?: { latitude: number; longitude: number } }[]) ?? [];
      for (const m of messages) {
        out.push({
          id: m.id,
          from: m.from,
          type: m.type,
          text: m.text?.body,
          lat: m.location?.latitude,
          lng: m.location?.longitude,
        });
      }
      const statuses = (value.statuses as { id: string; status: string; recipient_id: string }[]) ?? [];
      for (const s of statuses) {
        out.push({ id: s.id, type: "status", status: s.status, recipient: s.recipient_id });
      }
    }
  }
  return out;
}
