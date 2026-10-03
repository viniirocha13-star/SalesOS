import { prisma } from "@/lib/prisma";
import type { PlimProfile } from "@prisma/client";
import { tenantWhere } from "@/lib/plim/tenant-context";

export async function getWorkspaceSettings(tenantId: string) {
  return prisma.plimWorkspaceSettings.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
}

export async function updateGeneralSettings(
  tenantId: string,
  data: { workspaceName: string; timezone: string; testMode: boolean },
) {
  return prisma.plimWorkspaceSettings.update({
    where: { tenantId },
    data,
  });
}

export async function updateBrandSettings(
  tenantId: string,
  data: {
    brandName: string;
    brandColor: string;
    logoPath?: string | null;
    logoMargin: number;
    logoSize: number;
    logoOpacity: number;
  },
) {
  return prisma.plimWorkspaceSettings.update({
    where: { tenantId },
    data,
  });
}

export async function listWorkspaceMembers(tenantId: string) {
  return prisma.user.findMany({
    where: { ...tenantWhere(tenantId), active: true },
    select: { id: true, name: true, email: true, role: true, plimProfile: true },
    orderBy: { name: "asc" },
  });
}

export async function updateMemberPlimProfile(
  tenantId: string,
  userId: string,
  plimProfile: PlimProfile,
) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new Error("Usuário não encontrado no workspace.");
  return prisma.user.update({ where: { id: userId }, data: { plimProfile } });
}
