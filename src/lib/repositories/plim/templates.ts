import { prisma } from "@/lib/prisma";
import { DEFAULT_TEMPLATE_BODY } from "@/lib/plim/template-render";

export async function ensureDefaultTemplate(tenantId: string) {
  const existing = await prisma.plimMessageTemplate.findFirst({ where: { tenantId, isDefault: true } });
  if (existing) return existing;
  return prisma.plimMessageTemplate.create({
    data: { tenantId, name: "Padrão", body: DEFAULT_TEMPLATE_BODY, isDefault: true },
  });
}

export function listTemplates(tenantId: string) {
  return prisma.plimMessageTemplate.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export function upsertTemplate(
  tenantId: string,
  data: { id?: string; name: string; body: string; isDefault?: boolean },
) {
  if (data.id) {
    return prisma.plimMessageTemplate.update({
      where: { id: data.id },
      data: { name: data.name, body: data.body, isDefault: data.isDefault ?? false },
    });
  }
  return prisma.plimMessageTemplate.create({
    data: { tenantId, name: data.name, body: data.body, isDefault: data.isDefault ?? false },
  });
}
