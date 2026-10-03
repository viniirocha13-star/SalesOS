"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimAdmin } from "@/lib/plim/profile";
import {
  updateBrandSettings,
  updateGeneralSettings,
  updateMemberPlimProfile,
} from "@/lib/repositories/plim/settings";
import { getStorageProvider } from "@/lib/storage";

const generalSchema = z.object({
  workspaceName: z.string().min(2).max(120),
  timezone: z.string().min(2).max(64),
  testMode: z.coerce.boolean(),
  duplicateWindowHours: z.coerce.number().int().min(1).max(168).optional(),
});

const brandSchema = z.object({
  brandName: z.string().min(2).max(80),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoMargin: z.coerce.number().int().min(0).max(120),
  logoSize: z.coerce.number().int().min(24).max(256),
  logoOpacity: z.coerce.number().min(0).max(1),
});

export async function savePlimGeneral(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  if (!canPlimAdmin(ctx.profile)) throw new Error("Sem permissão");
  const parsed = generalSchema.parse({
    workspaceName: formData.get("workspaceName"),
    timezone: formData.get("timezone"),
    testMode: formData.get("testMode") === "on",
    duplicateWindowHours: formData.get("duplicateWindowHours")
      ? Number(formData.get("duplicateWindowHours"))
      : undefined,
  });
  await updateGeneralSettings(ctx.tenantId, {
    workspaceName: parsed.workspaceName,
    timezone: parsed.timezone,
    testMode: parsed.testMode,
    ...(parsed.duplicateWindowHours != null ? { duplicateWindowHours: parsed.duplicateWindowHours } : {}),
  });
  revalidatePath("/plim/configuracoes");
  revalidatePath("/plim");
}

export async function savePlimBrand(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  if (!canPlimAdmin(ctx.profile)) throw new Error("Sem permissão");
  const parsed = brandSchema.parse({
    brandName: formData.get("brandName"),
    brandColor: formData.get("brandColor"),
    logoMargin: formData.get("logoMargin"),
    logoSize: formData.get("logoSize"),
    logoOpacity: formData.get("logoOpacity"),
  });
  let logoPath: string | null | undefined;
  const file = formData.get("logo") as File | null;
  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const storage = getStorageProvider();
    const rel = `logos/${ctx.tenantId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const uploaded = await storage.upload(rel, buf, file.type || "image/png");
    logoPath = uploaded.path;
  }
  await updateBrandSettings(ctx.tenantId, { ...parsed, logoPath });
  revalidatePath("/plim/configuracoes");
}

export async function savePlimUserProfile(userId: string, plimProfile: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  if (!canPlimAdmin(ctx.profile)) throw new Error("Sem permissão");
  const profile = z.enum(["ADMIN", "OPERADOR", "VISUALIZADOR"]).parse(plimProfile);
  await updateMemberPlimProfile(ctx.tenantId, userId, profile);
  revalidatePath("/plim/configuracoes");
}
