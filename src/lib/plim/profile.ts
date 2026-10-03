import type { PlimProfile, Role } from "@prisma/client";

export const PLIM_PROFILE_LABEL: Record<PlimProfile, string> = {
  ADMIN: "Administrador PLIM",
  OPERADOR: "Operador PLIM",
  VISUALIZADOR: "Visualizador PLIM",
};

export function resolvePlimProfile(role: Role, explicit?: PlimProfile | null): PlimProfile {
  if (explicit) return explicit;
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "ADMIN";
  if (role === "ANALISTA" || role === "ANALYST") return "VISUALIZADOR";
  return "OPERADOR";
}

export function canPlimWrite(profile: PlimProfile): boolean {
  return profile === "ADMIN" || profile === "OPERADOR";
}

export function canPlimAdmin(profile: PlimProfile): boolean {
  return profile === "ADMIN";
}

export function canPlimViewAnalytics(_profile: PlimProfile): boolean {
  return true;
}
