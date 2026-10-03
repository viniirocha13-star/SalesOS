import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async () => {
  const ctx = await requireOrg("meta.view");
  const [wabas, phones] = await Promise.all([
    prisma.whatsAppBusinessAccount.findMany({ where: { organizationId: ctx.organization.id } }),
    prisma.phoneNumber.findMany({ where: { organizationId: ctx.organization.id } }),
  ]);
  return NextResponse.json({ wabas, phones });
});
