import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimAdmin } from "@/lib/plim/profile";
import { prisma } from "@/lib/prisma";
import { resolveMetaAdsToken, testMetaAdsConnection } from "@/lib/plim/meta-ads";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  if (!canPlimAdmin(ctx.profile)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const settings = await prisma.plimWorkspaceSettings.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { metaAdsToken: true },
  });
  const token = resolveMetaAdsToken(process.env.META_ADS_TOKEN, settings?.metaAdsToken);
  if (!token) {
    return NextResponse.json({ error: "Meta Ads não configurado (META_ADS_TOKEN ou token salvo no servidor)" }, { status: 400 });
  }
  try {
    const result = await testMetaAdsConnection(token);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao testar Meta Ads" },
      { status: 502 },
    );
  }
}
