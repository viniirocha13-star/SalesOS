import type { Role } from "@prisma/client";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  OPERADOR: "Operador",
  ANALISTA: "Analista",
};

const permissions: Record<string, Role[]> = {
  "dashboard.view": ["ADMIN", "SUPERVISOR", "OPERADOR", "ANALISTA"],
  "leads.view": ["ADMIN", "SUPERVISOR", "OPERADOR", "ANALISTA"],
  "leads.write": ["ADMIN", "SUPERVISOR", "OPERADOR"],
  "conversations.view": ["ADMIN", "SUPERVISOR", "OPERADOR"],
  "conversations.simulate": ["ADMIN", "SUPERVISOR", "OPERADOR"],
  "sales.view": ["ADMIN", "SUPERVISOR", "OPERADOR", "ANALISTA"],
  "operation.queue": ["ADMIN", "SUPERVISOR", "OPERADOR"],
  "operation.launch": ["ADMIN", "SUPERVISOR", "OPERADOR"],
  "campaigns.view": ["ADMIN", "SUPERVISOR", "ANALISTA"],
  "campaigns.write": ["ADMIN", "SUPERVISOR"],
  "offers.view": ["ADMIN", "SUPERVISOR", "ANALISTA"],
  "offers.import": ["ADMIN", "SUPERVISOR"],
  "offers.approve": ["ADMIN", "SUPERVISOR"],
  "knowledge.view": ["ADMIN", "SUPERVISOR", "ANALISTA"],
  "knowledge.write": ["ADMIN", "SUPERVISOR"],
  "map.view": ["ADMIN", "SUPERVISOR", "ANALISTA"],
  "supervisor.view": ["ADMIN", "SUPERVISOR", "ANALISTA"],
  "reports.view": ["ADMIN", "SUPERVISOR", "ANALISTA"],
  "admin.users": ["ADMIN"],
  "admin.audit": ["ADMIN", "SUPERVISOR"],
  "privacy.export": ["ADMIN"],
};

export function can(role: Role, permission: string): boolean {
  return permissions[permission]?.includes(role) ?? false;
}
