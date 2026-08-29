import type { Role } from "@prisma/client";
import { can } from "@/lib/rbac";

const PREFIXES: { prefix: string; permission: string }[] = [
  { prefix: "/home", permission: "operation.queue" },
  { prefix: "/inbox", permission: "conversations.view" },
  { prefix: "/conversas", permission: "conversations.simulate" },
  { prefix: "/leads", permission: "leads.view" },
  { prefix: "/vendas", permission: "sales.view" },
  { prefix: "/operacao", permission: "operation.queue" },
  { prefix: "/campanhas", permission: "campaigns.view" },
  { prefix: "/ofertas", permission: "offers.view" },
  { prefix: "/conhecimento", permission: "knowledge.view" },
  { prefix: "/mapa", permission: "map.view" },
  { prefix: "/supervisor", permission: "supervisor.view" },
  { prefix: "/relatorios", permission: "reports.view" },
  { prefix: "/admin", permission: "admin.audit" },
  { prefix: "/dashboard", permission: "dashboard.view" },
];

export function permissionForPath(pathname: string): string | null {
  const hit = PREFIXES.filter((p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/")).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
  return hit?.permission ?? null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const perm = permissionForPath(pathname);
  if (!perm) return Boolean(role);
  return can(role, perm);
}
