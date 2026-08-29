import { prisma } from "@/lib/prisma";
import { maskForLog } from "@/lib/pii";

export async function audit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  const safeMeta = input.metadata
    ? (maskForLog(input.metadata) as object)
    : undefined;
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? undefined,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? undefined,
      metadata: safeMeta,
      ip: input.ip ?? undefined,
    },
  });
}
