import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listAutopilots(tenantId: string) {
  return prisma.plimAutopilot.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" } });
}

export function createAutopilot(tenantId: string, data: Omit<Prisma.PlimAutopilotCreateInput, "tenant">) {
  return prisma.plimAutopilot.create({ data: { ...data, tenant: { connect: { id: tenantId } } } });
}

export function updateAutopilot(tenantId: string, id: string, data: Prisma.PlimAutopilotUpdateInput) {
  return prisma.plimAutopilot.updateMany({ where: { id, tenantId }, data });
}

export function deleteAutopilot(tenantId: string, id: string) {
  return prisma.plimAutopilot.deleteMany({ where: { id, tenantId } });
}
