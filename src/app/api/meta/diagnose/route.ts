import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { diagnoseMeta } from "@/wa/meta-connection";

export const POST = withApi(async () => {
  const ctx = await requireOrg("meta.view");
  const result = await diagnoseMeta(ctx.organization.id);
  return NextResponse.json({
    ok: result.ok,
    message: `${result.passed}/${result.total} verificações OK`,
    result,
  });
});

export const GET = POST;
