import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { submitTemplateToMeta } from "@/wa/templates";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApi(async (_request: Request, ctx: Ctx) => {
  const org = await requireOrg("templates.write");
  const { id } = await ctx.params;
  const template = await submitTemplateToMeta(org.organization.id, org.user.id, id);
  return NextResponse.json({
    ok: true,
    message: "Template enviado para análise da Meta. A aprovação não é garantida.",
    template,
  });
});
