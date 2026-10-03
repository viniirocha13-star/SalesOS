import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { setActiveOrganization } from "@/lib/org";
import { forbidden, notFound, readJson, unauthenticated, withApi } from "@/lib/api-error";
import { audit } from "@/lib/audit";

const schema = z.object({
  organizationId: z.string().min(1),
});

export const POST = withApi(async (request: Request) => {
  const session = await auth();
  if (!session?.user) throw unauthenticated();
  const { organizationId } = schema.parse(await readJson(request));

  const isSuper = session.user.role === "SUPER_ADMIN";
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: session.user.id },
    },
  });
  if (!membership && !isSuper) throw forbidden("Você não pertence a esta organização.");

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw notFound("Organização");

  await setActiveOrganization(org.id);
  await audit({
    actorId: session.user.id,
    organizationId: org.id,
    action: "organization.switch",
    entity: "Organization",
    entityId: org.id,
  });

  return NextResponse.json({ ok: true, organization: { id: org.id, name: org.name, slug: org.slug } });
});
