import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { estimateCampaignCost } from "@/wa/pricing";

const schema = z.object({
  templateId: z.string(),
  contactListId: z.string(),
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("campaigns.write");
  const body = schema.parse(await readJson(request));
  const [template, list] = await Promise.all([
    prisma.messageTemplate.findFirst({ where: { id: body.templateId, organizationId: ctx.organization.id } }),
    prisma.contactList.findFirst({ where: { id: body.contactListId, organizationId: ctx.organization.id } }),
  ]);
  if (!template || !list) return NextResponse.json({ error: "Template ou lista inválidos" }, { status: 400 });

  const { resolveListContactIds } = await import("@/wa/segments");
  const ids = await resolveListContactIds(ctx.organization.id, list);
  const estimate = await estimateCampaignCost({
    organizationId: ctx.organization.id,
    market: "BR",
    category: template.category,
    quantity: ids.length,
  });
  return NextResponse.json({ quantity: ids.length, estimate });
});
