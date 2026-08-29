import type { Role } from "@prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Administrador",
  MANAGER: "Gestor",
  SUPERVISOR: "Supervisor",
  OPERADOR: "Operador",
  OPERATOR: "Operador",
  ANALISTA: "Analista",
  ANALYST: "Analista",
};

const ops: Role[] = ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR", "OPERADOR", "OPERATOR"];
const view: Role[] = [...ops, "ANALISTA", "ANALYST"];
const admin: Role[] = ["ADMIN", "SUPER_ADMIN"];

const permissions: Record<string, Role[]> = {
  "dashboard.view": view,
  "leads.view": view,
  "leads.write": ops,
  "conversations.view": ops,
  "conversations.simulate": ops,
  "sales.view": view,
  "operation.queue": ops,
  "operation.launch": ops,
  "campaigns.view": ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR", "ANALISTA", "ANALYST"],
  "campaigns.write": ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR"],
  "offers.view": view,
  "offers.import": ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR", "OPERADOR", "OPERATOR"],
  "offers.approve": ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"],
  "knowledge.view": ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR", "ANALISTA", "ANALYST"],
  "knowledge.write": ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"],
  "map.view": ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR", "ANALISTA", "ANALYST"],
  "supervisor.view": ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR", "ANALISTA", "ANALYST"],
  "reports.view": ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPERVISOR", "ANALISTA", "ANALYST"],
  "admin.users": admin,
  "admin.audit": ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"],
  "privacy.export": admin,
  "view_sensitive_data": admin,
  "manage_ai": admin,
  "assume_conversation": ops,
  "view_financial_metrics": ["ADMIN", "SUPER_ADMIN", "MANAGER", "ANALISTA", "ANALYST"],
};

export function can(role: Role, permission: string): boolean {
  return permissions[permission]?.includes(role) ?? false;
}
