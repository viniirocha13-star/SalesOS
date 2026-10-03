import { NextResponse } from "next/server";
import { getShortLinkByCode } from "@/lib/repositories/plim/short-links";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = await getShortLinkByCode(code);
  if (!link) {
    return NextResponse.json({ error: "Link não encontrado" }, { status: 404 });
  }

  const url = new URL(request.url);
  await prisma.plimClickEvent.create({
    data: {
      tenantId: link.tenantId,
      offerId: link.offerId,
      groupId: link.groupId,
      marketplace: link.offer.marketplace,
      campaign: link.campaign,
      userAgent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
      utmSource: url.searchParams.get("utm_source"),
      utmMedium: url.searchParams.get("utm_medium"),
      utmCampaign: url.searchParams.get("utm_campaign"),
      utmTerm: url.searchParams.get("utm_term"),
      utmContent: url.searchParams.get("utm_content"),
    },
  });

  return NextResponse.redirect(link.destinationUrl, 302);
}
