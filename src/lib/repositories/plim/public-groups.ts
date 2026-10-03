import { prisma } from "@/lib/prisma";

export function listMasterHubs() {
  return prisma.plimGroup.findMany({
    where: { isMasterHub: true, active: true, publicSlug: { not: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      publicSlug: true,
      niche: true,
      memberLimit: true,
      platform: true,
    },
  });
}

export function getMasterHubBySlug(slug: string) {
  return prisma.plimGroup.findFirst({
    where: { publicSlug: slug, isMasterHub: true, active: true },
  });
}

export async function countPublicHubJoins(groupId: string) {
  return prisma.plimClickEvent.count({
    where: { groupId, utmMedium: "public_hub" },
  });
}
