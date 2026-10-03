import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { pauseCampaign } from "@/wa/campaigns";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApi(async (_req: Request, ctx: Ctx) => {
  const org = await requireOrg("campaigns.control");
  const { id } = await ctx.params;
  await pauseCampaign(org.organization.id, org.user.id, id);
  return NextResponse.json({ ok: true, message: "Campanha pausada." });
});
