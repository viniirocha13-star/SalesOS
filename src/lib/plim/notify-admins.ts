import { prisma } from "@/lib/prisma";

export async function notifyPlimAdmins(tenantId: string, title: string, body: string, href: string) {
  const admins = await prisma.user.findMany({
    where: {
      tenantId,
      active: true,
      OR: [{ plimProfile: "ADMIN" }, { role: { in: ["ADMIN", "SUPER_ADMIN"] } }],
    },
    select: { id: true },
  });
  if (!admins.length) {
    await prisma.notification.create({ data: { title, body, href } });
    return;
  }
  await prisma.notification.createMany({
    data: admins.map((u) => ({ userId: u.id, title, body, href })),
  });
}
