import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { getOnboardingProgress } from "@/wa/onboarding-progress";

export const GET = withApi(async () => {
  const ctx = await requireOrg();
  const progress = await getOnboardingProgress(ctx.organization.id);
  return NextResponse.json(progress);
});
