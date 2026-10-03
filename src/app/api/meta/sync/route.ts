import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { syncMetaAssets } from "@/wa/meta-connection";

export const POST = withApi(async () => {
  const ctx = await requireOrg("meta.manage");
  const result = await syncMetaAssets(ctx.organization.id);
  return NextResponse.json({
    ok: true,
    message: `Sincronizado: ${result.wabas} WABA(s), ${result.phones} número(s), ${result.templates} template(s).`,
    result,
  });
});
