import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { syncTemplatesForOrg } from "@/wa/templates";

export const POST = withApi(async () => {
  const ctx = await requireOrg("templates.write");
  const result = await syncTemplatesForOrg(ctx.organization.id, ctx.user.id);
  return NextResponse.json({
    ok: true,
    message: `${result.count} template(s) sincronizado(s) com a Meta.`,
    result,
  });
});
