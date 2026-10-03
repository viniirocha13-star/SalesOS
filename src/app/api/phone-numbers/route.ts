import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export const GET = withApi(async () => {
  const ctx = await requireOrg("meta.view");
  const phones = await prisma.phoneNumber.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ isDefault: "desc" }, { displayPhoneNumber: "asc" }],
  });
  return NextResponse.json({ phones });
});
