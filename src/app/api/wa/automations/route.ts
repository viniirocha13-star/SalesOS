import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { readJson, withApi, notFound } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { checkPlanLimit } from "@/wa/plan-limits";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  trigger: z.enum([
    "CONTACT_REPLIED",
    "MESSAGE_FAILED",
    "CONTACT_OPTED_OUT",
    "CAMPAIGN_FINISHED",
    "CONTACT_CREATED",
  ]),
  action: z.enum(["ADD_TAG", "ADD_TO_LIST", "NOTIFY", "WEBHOOK"]),
  actionConfig: z.record(z.string(), z.string()),
  enabled: z.boolean().default(true),
});

export const GET = withApi(async () => {
  const ctx = await requireOrg("automations.view");
  const automations = await prisma.automation.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { runs: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ automations });
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("automations.write");
  await checkPlanLimit(ctx.organization.id, "automations", 1);
  const body = createSchema.parse(await readJson(request));
  const automation = await prisma.automation.create({
    data: {
      organizationId: ctx.organization.id,
      name: body.name,
      trigger: body.trigger,
      action: body.action,
      actionConfig: body.actionConfig,
      enabled: body.enabled,
    },
  });
  await audit({
    actorId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "automation.create",
    entity: "Automation",
    entityId: automation.id,
  });
  return NextResponse.json({ ok: true, automation });
});

export const PATCH = withApi(async (request: Request) => {
  const ctx = await requireOrg("automations.write");
  const body = z
    .object({ id: z.string(), enabled: z.boolean().optional(), name: z.string().optional() })
    .parse(await readJson(request));
  const existing = await prisma.automation.findFirst({
    where: { id: body.id, organizationId: ctx.organization.id },
  });
  if (!existing) throw notFound("Automação");
  const automation = await prisma.automation.update({
    where: { id: existing.id },
    data: {
      enabled: body.enabled,
      name: body.name,
    },
  });
  return NextResponse.json({ ok: true, automation });
});
