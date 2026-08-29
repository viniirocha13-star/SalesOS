import { prisma } from "@/lib/prisma";
import type { DomainEventType } from "@prisma/client";

type Handler = (event: { type: DomainEventType; aggregateId: string; payload: unknown }) => Promise<void>;

const handlers = new Map<DomainEventType, Handler[]>();

export function on(type: DomainEventType, handler: Handler) {
  const list = handlers.get(type) ?? [];
  list.push(handler);
  handlers.set(type, list);
}

export async function emit(type: DomainEventType, aggregateId: string, payload: unknown) {
  const event = await prisma.domainEvent.create({
    data: { type, aggregateId, payload: payload as object },
  });

  const list = handlers.get(type) ?? [];
  for (const handler of list) {
    try {
      await handler({ type, aggregateId, payload });
    } catch (error) {
      console.error("[event-bus]", type, maskError(error));
    }
  }

  await prisma.domainEvent.update({
    where: { id: event.id },
    data: { processedAt: new Date() },
  });
}

function maskError(error: unknown) {
  return error instanceof Error ? error.message : "erro";
}
