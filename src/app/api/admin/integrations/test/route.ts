import { NextResponse } from "next/server";
import { requirePermission, errorResponse } from "@/lib/session";
import { getWhatsAppProvider } from "@/integrations/whatsapp/provider";
import { createUtilityResponse } from "@/ai/openai";
import { prisma } from "@/lib/prisma";
import { openaiConfigured } from "@/lib/ai-models";

export async function POST(request: Request) {
  try {
    await requirePermission("admin.audit");
    const { slug } = (await request.json()) as { slug?: string };
    if (slug === "whatsapp") {
      const started = Date.now();
      const result = await getWhatsAppProvider().testConnection();
      await prisma.integration.upsert({
        where: { slug: "whatsapp" },
        update: {
          status: result.ok ? "CONNECTED" : "ERROR",
          lastError: result.error ?? null,
          testedAt: new Date(),
        },
        create: {
          slug: "whatsapp",
          name: "WhatsApp Cloud API",
          status: result.ok ? "CONNECTED" : "ERROR",
          lastError: result.error ?? null,
          testedAt: new Date(),
        },
      });
      return NextResponse.json({ ...result, latencyMs: Date.now() - started });
    }
    if (slug === "openai") {
      if (!openaiConfigured()) {
        return NextResponse.json({ ok: false, error: "not_configured" });
      }
      const started = Date.now();
      try {
        const ping = await createUtilityResponse({
          messages: [{ role: "user", content: "Responda apenas: ok" }],
        });
        await prisma.integration.upsert({
          where: { slug: "openai" },
          update: { status: "CONNECTED", lastError: null, testedAt: new Date() },
          create: { slug: "openai", name: "OpenAI", status: "CONNECTED", testedAt: new Date() },
        });
        return NextResponse.json({ ok: true, latencyMs: Date.now() - started, model: ping.model });
      } catch {
        await prisma.integration.upsert({
          where: { slug: "openai" },
          update: { status: "ERROR", lastError: "request_failed", testedAt: new Date() },
          create: { slug: "openai", name: "OpenAI", status: "ERROR", lastError: "request_failed" },
        });
        return NextResponse.json({ ok: false, error: "request_failed", latencyMs: Date.now() - started });
      }
    }
    return NextResponse.json({ error: "slug_invalido" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
