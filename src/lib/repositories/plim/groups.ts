import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listGroups(tenantId: string) {
  return prisma.plimGroup.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export function createGroup(tenantId: string, data: Omit<Prisma.PlimGroupCreateInput, "tenant">) {
  return prisma.plimGroup.create({ data: { ...data, tenant: { connect: { id: tenantId } } } });
}

export function updateGroup(tenantId: string, id: string, data: Prisma.PlimGroupUpdateInput) {
  return prisma.plimGroup.updateMany({ where: { id, tenantId }, data }).then(() =>
    prisma.plimGroup.findFirst({ where: { id, tenantId } }),
  );
}

export function deleteGroup(tenantId: string, id: string) {
  return prisma.plimGroup.deleteMany({ where: { id, tenantId } });
}
