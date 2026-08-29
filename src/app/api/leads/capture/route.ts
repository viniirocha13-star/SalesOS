import { NextResponse } from "next/server";
import { createLead } from "@/domain/leads";
import type { LeadSource } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";

const SOURCE_MAP: Record<string, LeadSource> = {
  meta: "META",
  facebook: "FACEBOOK",
  instagram: "INSTAGRAM",
  google: "GOOGLE",
  qr: "QR_CODE",
  link: "LINK",
  organico: "ORGANICO",
  indicacao: "INDICACAO",
};

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "cap";
  if (!rateLimit(`cap:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone obrigatório" }, { status: 400 });
  const src = (url.searchParams.get("utm_source") || url.searchParams.get("src") || "link").toLowerCase();
  const lead = await createLead({
    phone,
    name: url.searchParams.get("name") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    origin: SOURCE_MAP[src] ?? "LINK",
    source: src,
    utmSource: url.searchParams.get("utm_source") ?? undefined,
    utmMedium: url.searchParams.get("utm_medium") ?? undefined,
    utmCampaign: url.searchParams.get("utm_campaign") ?? undefined,
    utmContent: url.searchParams.get("utm_content") ?? undefined,
  });
  return NextResponse.json({ leadId: lead.id, conversationHint: "/conversas" });
}
