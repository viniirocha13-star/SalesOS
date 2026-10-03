import { NextResponse } from "next/server";
import { readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { createDraftTemplate, templateDraftSchema } from "@/wa/templates";

export const GET = withApi(async () => {
  const ctx = await requireOrg("templates.view");
  const templates = await prisma.messageTemplate.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ templates });
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("templates.write");
  const body = templateDraftSchema.parse(await readJson(request));
  const result = await createDraftTemplate(ctx.organization.id, ctx.user.id, body);
  return NextResponse.json({ ok: true, ...result });
});
