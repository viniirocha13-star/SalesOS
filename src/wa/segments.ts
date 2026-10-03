import type { ContactList, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SegmentFilter = {
  tag?: string;
  source?: string;
  city?: string;
  state?: string;
  status?: string;
  createdAfterDays?: number;
  lastInteractionBeforeDays?: number;
  excludeOptedOut?: boolean;
};

export function filterToWhere(organizationId: string, filter: SegmentFilter): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { organizationId };
  if (filter.excludeOptedOut !== false) {
    where.optedOutAt = null;
    where.status = filter.status ? (filter.status as never) : { not: "OPTED_OUT" };
  } else if (filter.status) {
    where.status = filter.status as never;
  }
  if (filter.source) where.source = filter.source;
  if (filter.city) where.city = filter.city;
  if (filter.state) where.state = filter.state;
  if (filter.createdAfterDays != null) {
    const d = new Date();
    d.setDate(d.getDate() - filter.createdAfterDays);
    where.createdAt = { gte: d };
  }
  if (filter.lastInteractionBeforeDays != null) {
    const d = new Date();
    d.setDate(d.getDate() - filter.lastInteractionBeforeDays);
    where.OR = [{ lastMessageAt: { lt: d } }, { lastMessageAt: null }];
  }
  if (filter.tag) {
    where.tags = { some: { tag: { name: filter.tag, organizationId } } };
  }
  return where;
}

export async function resolveListContactIds(organizationId: string, list: ContactList): Promise<string[]> {
  if (list.kind === "DYNAMIC") {
    const filter = (list.filter ?? {}) as SegmentFilter;
    const contacts = await prisma.contact.findMany({
      where: filterToWhere(organizationId, filter),
      select: { id: true },
    });
    return contacts.map((c) => c.id);
  }
  const members = await prisma.contactListMember.findMany({
    where: { listId: list.id, organizationId },
    select: { contactId: true },
  });
  return members.map((m) => m.contactId);
}
