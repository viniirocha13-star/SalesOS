import { prisma } from "@/lib/prisma";
import type { PlimProfile } from "@prisma/client";
import { resolvePlimProfile } from "@/lib/plim/profile";
import type { Role } from "@prisma/client";

export async function getUserTenantId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  return user?.tenantId ?? null;
}

export async function requireTenantForUser(userId: string, _role: Role): Promise<string> {
  const existing = await getUserTenantId(userId);
  if (existing) return existing;
  const tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (!tenant) throw new Error("Nenhum workspace configurado.");
  await prisma.user.update({ where: { id: userId }, data: { tenantId: tenant.id } });
  return tenant.id;
}

export async function getPlimContext(userId: string, role: Role) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { tenantId: true, plimProfile: true, name: true, email: true },
  });
  const tenantId = user.tenantId ?? await requireTenantForUser(userId, role);
  const profile = resolvePlimProfile(role, user.plimProfile);
  return { tenantId, profile, user };
}

export async function ensurePlimSettings(tenantId: string) {
  return prisma.plimWorkspaceSettings.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId },
  });
}

export function tenantWhere(tenantId: string) {
  return { tenantId };
}

export function assertTenantAccess(recordTenantId: string, tenantId: string, profile: PlimProfile) {
  if (recordTenantId !== tenantId) {
    throw new Error("Acesso negado ao workspace.");
  }
  if (!profile) throw new Error("Perfil PLIM inválido.");
}
