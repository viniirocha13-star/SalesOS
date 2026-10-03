import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/logger";
import { verifyMetaSignature, verifyTokenMatches } from "@/integrations/whatsapp/signature";
import { extractWhatsAppEvents } from "@/integrations/whatsapp/parse";
import { enqueueWaJob, WA_JOB } from "@/workers/wa/queue";

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
  const ip = request.headers.get("x-forwarded-for") ?? "meta";
  if (!rateLimit(`meta-wh:${ip}`, 300, 60_000)) {
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
      const phone = event.phoneNumberId
        ? await prisma.phoneNumber.findFirst({ where: { phoneNumberId: event.phoneNumberId } })
        : null;

      const created = await prisma.webhookEvent.create({
        data: {
          provider: "meta",
          providerEventId: event.providerEventId,
          organizationId: phone?.organizationId,
          phoneNumberId: event.phoneNumberId,
          wabaId: event.businessAccountId,
          eventType: event.kind,
          payload: event,
          status: "RECEIVED",
        },
      });
      await enqueueWaJob(
        WA_JOB.WEBHOOK_PROCESS,
        { eventId: created.id, organizationId: phone?.organizationId ?? "" },
        { jobId: `wh-${event.providerEventId}` },
      );
    } catch (error) {
      // unique constraint = duplicate → ignore
      const msg = String(error);
      if (msg.includes("Unique constraint") || msg.includes("unique")) {
        logInfo("webhook.meta.duplicate", { id: event.providerEventId });
      } else {
        logError("webhook.meta.persist_failed", { message: msg });
      }
    }
  }

  logInfo("webhook.meta.accepted", { events: events.length });
  // Responde rápido — processamento no worker
  return NextResponse.json({ ok: true });
}
