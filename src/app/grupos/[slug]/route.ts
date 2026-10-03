import { NextResponse } from "next/server";
import { countPublicHubJoins, getMasterHubBySlug } from "@/lib/repositories/plim/public-groups";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = await getMasterHubBySlug(slug);
  if (!group) {
    return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
  }

  const joins = await countPublicHubJoins(group.id);
  if (group.memberLimit != null && joins >= group.memberLimit) {
    return new NextResponse(
      `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:system-ui;padding:2rem;text-align:center">
        <h1>Grupo lotado</h1><p>O limite de ${group.memberLimit} entradas foi atingido.</p></body></html>`,
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const redirectUrl = group.publicRedirectUrl?.trim() || group.externalId?.trim();
  if (!redirectUrl) {
    return NextResponse.json({ error: "Grupo sem link de destino configurado" }, { status: 503 });
  }

  const url = new URL(request.url);
  await prisma.plimClickEvent.create({
    data: {
      tenantId: group.tenantId,
      groupId: group.id,
      destination: redirectUrl,
      utmMedium: "public_hub",
      utmSource: "grupos",
      utmCampaign: group.publicSlug ?? slug,
      userAgent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    },
  });

  return NextResponse.redirect(redirectUrl, 302);
}
