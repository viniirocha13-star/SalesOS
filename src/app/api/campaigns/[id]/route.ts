import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { getCampaignReview } from "@/wa/campaigns";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi(async (_req: Request, ctx: Ctx) => {
  const org = await requireOrg("campaigns.view");
  const { id } = await ctx.params;
  const review = await getCampaignReview(org.organization.id, id);
  return NextResponse.json(review);
});
