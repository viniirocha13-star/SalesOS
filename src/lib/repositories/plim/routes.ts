import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listRoutes(tenantId: string) {
  return prisma.plimRoute.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" } });
}

export function createRoute(tenantId: string, data: Omit<Prisma.PlimRouteCreateInput, "tenant">) {
  return prisma.plimRoute.create({ data: { ...data, tenant: { connect: { id: tenantId } } } });
}

export function updateRoute(tenantId: string, id: string, data: Prisma.PlimRouteUpdateInput) {
  return prisma.plimRoute.updateMany({ where: { id, tenantId }, data });
}

export function deleteRoute(tenantId: string, id: string) {
  return prisma.plimRoute.deleteMany({ where: { id, tenantId } });
}
