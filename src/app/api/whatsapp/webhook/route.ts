import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { verifyMetaSignature, verifyTokenMatches } from "@/integrations/whatsapp/signature";
import { extractWhatsAppEvents } from "@/integrations/whatsapp/parse";
import { enqueueProcessInbound } from "@/workers/queue";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && verifyTokenMatches(token)) {
    return new NextResponse(challenge ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "wa";
  if (!rateLimit(`wa:${ip}`, 240, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const raw = await request.text();
  if (!verifyMetaSignature(raw, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const events = extractWhatsAppEvents(body);
  for (const event of events) {
    try {
      const created = await persistEventIfNew(event.providerEventId, event);
      if (created) await enqueueProcessInbound(event.providerEventId);
    } catch (error) {
      logError("webhook.event_failed", { message: String(error) });
    }
  }

  logInfo("webhook.accepted", { events: events.length });
  return NextResponse.json({ ok: true });
}

async function persistEventIfNew(providerEventId: string, payload: object) {
  try {
    await prisma.whatsAppInboundEvent.create({
      data: { providerEventId, payload },
    });
    await prisma.integration.upsert({
      where: { slug: "whatsapp" },
      update: { testedAt: new Date(), status: "CONNECTED" },
      create: { slug: "whatsapp", name: "WhatsApp Cloud API", status: "CONNECTED", testedAt: new Date() },
    });
    return true;
  } catch {
    logInfo("webhook.duplicate", {});
    return false;
  }
}
