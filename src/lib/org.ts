import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { OrgRole, Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canOrg, type OrgPermission } from "@/lib/org-rbac";
import { forbidden, noOrganization, unauthenticated } from "@/lib/api-error";

export const ORG_COOKIE = "wa_org";

export type OrgContext = {
  user: { id: string; name?: string | null; email?: string | null; role: Role };
  organization: { id: string; name: string; slug: string; country: string; defaultLanguage: string; requireConsentForCampaigns: boolean };
  role: OrgRole;
  isSuperAdmin: boolean;
  memberships: { organizationId: string; name: string; slug: string; role: OrgRole }[];
};

async function loadContext(): Promise<OrgContext | null | "unauthenticated"> {
  const session = await auth();
  if (!session?.user) return "unauthenticated";
  const user = session.user;
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  const jar = await cookies();
  const wanted = jar.get(ORG_COOKIE)?.value;

  let chosen = memberships.find((m) => m.organizationId === wanted) ?? memberships[0];
  let role: OrgRole | null = chosen?.role ?? null;

  if (!chosen && isSuperAdmin && wanted) {
    // Super admin pode operar qualquer organização, sem precisar ser membro.
    const org = await prisma.organization.findUnique({ where: { id: wanted } });
    if (org) {
      chosen = { organizationId: org.id, organization: org, role: "OWNER", id: "", userId: user.id, createdAt: new Date() };
      role = "OWNER";
    }
  }
  if (!chosen) return null;
  const org = chosen.organization;
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      country: org.country,
      defaultLanguage: org.defaultLanguage,
      requireConsentForCampaigns: org.requireConsentForCampaigns,
    },
    role: isSuperAdmin ? "OWNER" : (role as OrgRole),
    isSuperAdmin,
    memberships: memberships.map((m) => ({
      organizationId: m.organizationId,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    })),
  };
}

/** Para páginas: redireciona para login/onboarding quando necessário. */
export async function getOrgContext(permission?: OrgPermission): Promise<OrgContext> {
  const ctx = await loadContext();
  if (ctx === "unauthenticated") redirect("/login");
  if (!ctx) redirect("/onboarding");
  if (permission && !canOrg(ctx.role, permission)) redirect("/analytics?forbidden=1");
  return ctx;
}

/** Para páginas que podem funcionar sem organização (ex.: onboarding). */
export async function getOptionalOrgContext(): Promise<OrgContext | null> {
  const ctx = await loadContext();
  if (ctx === "unauthenticated") redirect("/login");
  return ctx;
}

/** Para rotas de API: lança ApiError. */
export async function requireOrg(permission?: OrgPermission): Promise<OrgContext> {
  const ctx = await loadContext();
  if (ctx === "unauthenticated") throw unauthenticated();
  if (!ctx) throw noOrganization();
  if (permission && !canOrg(ctx.role, permission)) throw forbidden();
  return ctx;
}

export async function setActiveOrganization(organizationId: string) {
  const jar = await cookies();
  jar.set(ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
