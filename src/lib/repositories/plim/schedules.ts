import { prisma } from "@/lib/prisma";
import type { Prisma, PlimScheduleRepeat } from "@prisma/client";

export function listSchedules(tenantId: string) {
  return prisma.plimSchedule.findMany({
    where: { tenantId },
    orderBy: { scheduledAt: "asc" },
    include: { offer: true },
  });
}

export function createSchedule(
  tenantId: string,
  data: {
    offerId: string;
    destinationGroupIds: string[];
    scheduledAt: Date;
    repeat: PlimScheduleRepeat;
  },
) {
  return prisma.plimSchedule.create({
    data: {
      tenant: { connect: { id: tenantId } },
      offer: { connect: { id: data.offerId } },
      destinationGroupIds: data.destinationGroupIds,
      scheduledAt: data.scheduledAt,
      repeat: data.repeat,
    },
  });
}

export function cancelSchedule(tenantId: string, id: string) {
  return prisma.plimSchedule.updateMany({
    where: { id, tenantId },
    data: { status: "CANCELADO" },
  });
}
