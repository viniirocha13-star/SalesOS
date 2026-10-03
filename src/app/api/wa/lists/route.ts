import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { badRequest, readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  kind: z.enum(["STATIC", "DYNAMIC"]).default("STATIC"),
  filter: z
    .object({
      tag: z.string().optional(),
      source: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      status: z.string().optional(),
      createdAfterDays: z.number().int().positive().optional(),
      lastInteractionBeforeDays: z.number().int().positive().optional(),
      excludeOptedOut: z.boolean().optional(),
    })
    .optional(),
  contactIds: z.array(z.string()).optional(),
});

export const GET = withApi(async () => {
  const ctx = await requireOrg("lists.view");
  const lists = await prisma.contactList.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { members: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ lists });
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("lists.write");
  const body = createSchema.parse(await readJson(request));
  if (body.kind === "DYNAMIC" && !body.filter) {
    throw badRequest("Segmento dinâmico precisa de um filtro.");
  }

  const list = await prisma.contactList.create({
    data: {
      organizationId: ctx.organization.id,
      name: body.name,
      description: body.description || null,
      kind: body.kind,
      filter: body.kind === "DYNAMIC" ? body.filter : undefined,
    },
  });

  if (body.kind === "STATIC" && body.contactIds?.length) {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: ctx.organization.id, id: { in: body.contactIds } },
      select: { id: true },
    });
    if (contacts.length) {
      await prisma.contactListMember.createMany({
        data: contacts.map((c) => ({
          organizationId: ctx.organization.id,
          listId: list.id,
          contactId: c.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  await audit({
    actorId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "list.create",
    entity: "ContactList",
    entityId: list.id,
  });

  return NextResponse.json({ ok: true, list });
});
