import { prisma } from "@/lib/prisma";
import type { PlimQueueItemStatus, Prisma } from "@prisma/client";

export function listQueue(tenantId: string) {
  return prisma.plimQueueItem.findMany({
    where: { tenantId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { group: true, offer: true },
  });
}

export async function nextQueuePosition(tenantId: string) {
  const max = await prisma.plimQueueItem.aggregate({ where: { tenantId }, _max: { position: true } });
  return (max._max.position ?? 0) + 1;
}

export async function enqueueOffer(tenantId: string, input: {
  offerId: string;
  groupId: string;
  messageBody?: string;
  imageUrl?: string;
  campaign?: string;
}) {
  const [offer, group] = await Promise.all([
    prisma.plimOffer.findFirst({ where: { id: input.offerId, tenantId } }),
    prisma.plimGroup.findFirst({ where: { id: input.groupId, tenantId } }),
  ]);
  if (!offer || !group) throw new Error("Oferta ou grupo inválido");
  const position = await nextQueuePosition(tenantId);
  return prisma.plimQueueItem.create({
    data: {
      tenantId,
      offerId: offer.id,
      groupId: group.id,
      platform: group.platform,
      productName: offer.productName,
      destination: group.name,
      messageBody: input.messageBody ?? offer.editorMessage ?? offer.description,
      imageUrl: input.imageUrl ?? offer.imageUrl,
      campaign: input.campaign,
      position,
      status: "AGUARDANDO",
    },
  });
}

export async function setQueueStatus(tenantId: string, id: string, status: PlimQueueItemStatus) {
  return prisma.plimQueueItem.updateMany({ where: { id, tenantId }, data: { status } });
}

export async function moveQueueItem(tenantId: string, id: string, direction: "up" | "down") {
  const items = await listQueue(tenantId);
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= items.length) return;
  const a = items[idx]!;
  const b = items[swap]!;
  await prisma.$transaction([
    prisma.plimQueueItem.update({ where: { id: a.id }, data: { position: b.position } }),
    prisma.plimQueueItem.update({ where: { id: b.id }, data: { position: a.position } }),
  ]);
}

export async function removeQueueItem(tenantId: string, id: string) {
  return prisma.plimQueueItem.deleteMany({ where: { id, tenantId } });
}

export async function createQueueItem(tenantId: string, data: Prisma.PlimQueueItemCreateInput) {
  return prisma.plimQueueItem.create({ data: { ...data, tenant: { connect: { id: tenantId } } } });
}
