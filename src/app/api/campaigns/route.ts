import { NextResponse } from "next/server";
import { readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { campaignDraftSchema, createCampaign } from "@/wa/campaigns";

export const GET = withApi(async () => {
  const ctx = await requireOrg("campaigns.view");
  const campaigns = await prisma.waCampaign.findMany({
    where: { organizationId: ctx.organization.id },
    include: { template: true, phoneNumber: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("campaigns.write");
  const body = campaignDraftSchema.parse(await readJson(request));
  const result = await createCampaign(ctx.organization.id, ctx.user.id, body);
  return NextResponse.json({ ok: true, ...result });
});
