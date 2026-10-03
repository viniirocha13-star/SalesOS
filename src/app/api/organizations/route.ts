import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { badRequest, conflict, readJson, withApi } from "@/lib/api-error";
import { requireOrg, setActiveOrganization, slugify } from "@/lib/org";
import { auth } from "@/auth";
import { unauthenticated } from "@/lib/api-error";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(200).optional().nullable(),
  tradeName: z.string().trim().max(200).optional().nullable(),
  taxId: z.string().trim().max(32).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().email().max(200).optional().nullable(),
  country: z.string().trim().length(2).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const GET = withApi(async () => {
  const ctx = await requireOrg();
  return NextResponse.json({
    organization: ctx.organization,
    role: ctx.role,
    memberships: ctx.memberships,
  });
});

export const POST = withApi(async (request: Request) => {
  const session = await auth();
  if (!session?.user) throw unauthenticated();

  const body = createSchema.parse(await readJson(request));
  const baseSlug = slugify(body.name) || `empresa-${Date.now().toString(36)}`;
  let slug = baseSlug;
  for (let i = 0; i < 8; i++) {
    const clash = await prisma.organization.findUnique({ where: { slug } });
    if (!clash) break;
    slug = `${baseSlug}-${i + 2}`;
  }

  const existingMembership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
  });

  let starter = await prisma.plan.findUnique({ where: { slug: "starter" } });
  if (!starter) {
    starter = await prisma.plan.create({
      data: {
        slug: "starter",
        name: "Starter",
        priceCents: 0,
        maxUsers: 3,
        maxContacts: 1000,
        maxMessagesPerMonth: 5000,
        maxPhoneNumbers: 1,
        maxAutomations: 3,
        logRetentionDays: 30,
        sortOrder: 1,
      },
    });
  }

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: body.name,
        slug,
        legalName: body.legalName || null,
        tradeName: body.tradeName || null,
        taxId: body.taxId || null,
        website: body.website || null,
        phone: body.phone || null,
        email: body.email || null,
        country: (body.country ?? "BR").toUpperCase(),
        description: body.description || null,
      },
    });
    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: session.user.id,
        role: "OWNER",
      },
    });
    await tx.metaConnection.create({
      data: { organizationId: organization.id, status: "NOT_CONNECTED" },
    });
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + 14);
    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planId: starter!.id,
        status: "TRIALING",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });
    return organization;
  });

  await setActiveOrganization(org.id);
  await audit({
    actorId: session.user.id,
    organizationId: org.id,
    action: "organization.create",
    entity: "Organization",
    entityId: org.id,
    metadata: { first: !existingMembership },
  });

  return NextResponse.json({
    ok: true,
    organization: { id: org.id, name: org.name, slug: org.slug },
    next: "/onboarding?step=meta",
  });
});

export const PATCH = withApi(async (request: Request) => {
  const ctx = await requireOrg("org.manage");
  const body = createSchema.partial().parse(await readJson(request));
  if (body.name !== undefined && body.name.trim().length < 2) {
    throw badRequest("Nome da empresa muito curto.");
  }
  if (body.taxId) {
    const clash = await prisma.organization.findFirst({
      where: { taxId: body.taxId, NOT: { id: ctx.organization.id } },
    });
    if (clash) throw conflict("Já existe uma organização com este CNPJ/documento.");
  }
  const updated = await prisma.organization.update({
    where: { id: ctx.organization.id },
    data: {
      name: body.name ?? undefined,
      legalName: body.legalName === undefined ? undefined : body.legalName,
      tradeName: body.tradeName === undefined ? undefined : body.tradeName,
      taxId: body.taxId === undefined ? undefined : body.taxId,
      website: body.website === undefined ? undefined : body.website,
      phone: body.phone === undefined ? undefined : body.phone,
      email: body.email === undefined ? undefined : body.email,
      country: body.country?.toUpperCase(),
      description: body.description === undefined ? undefined : body.description,
    },
  });
  await audit({
    actorId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "organization.update",
    entity: "Organization",
    entityId: updated.id,
  });
  return NextResponse.json({ ok: true, organization: updated });
});
