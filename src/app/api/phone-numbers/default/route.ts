import { z } from "zod";
import { NextResponse } from "next/server";
import { notFound, readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

const schema = z.object({ phoneNumberId: z.string().min(1) });

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("meta.manage");
  const { phoneNumberId } = schema.parse(await readJson(request));
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: phoneNumberId, organizationId: ctx.organization.id },
  });
  if (!phone) throw notFound("Número");

  await prisma.$transaction([
    prisma.phoneNumber.updateMany({
      where: { organizationId: ctx.organization.id },
      data: { isDefault: false },
    }),
    prisma.phoneNumber.update({
      where: { id: phone.id },
      data: { isDefault: true },
    }),
  ]);

  await audit({
    actorId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "phone.set_default",
    entity: "PhoneNumber",
    entityId: phone.id,
  });

  return NextResponse.json({ ok: true, message: "Número padrão atualizado." });
});
