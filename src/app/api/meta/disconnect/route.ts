import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { disconnectMeta } from "@/wa/meta-connection";

export const POST = withApi(async () => {
  const ctx = await requireOrg("meta.manage");
  await disconnectMeta(ctx.organization.id, ctx.user.id);
  return NextResponse.json({ ok: true, message: "Meta desconectada. Token revogado no vault." });
});
