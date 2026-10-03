import type { OrgRole } from "@prisma/client";

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  ANALYST: "Analista",
  SUPPORT: "Suporte",
};

export const ORG_ROLES: OrgRole[] = ["OWNER", "ADMIN", "OPERATOR", "ANALYST", "SUPPORT"];

const owner: OrgRole[] = ["OWNER"];
const admins: OrgRole[] = ["OWNER", "ADMIN"];
const operators: OrgRole[] = ["OWNER", "ADMIN", "OPERATOR"];
const everyone: OrgRole[] = ["OWNER", "ADMIN", "OPERATOR", "ANALYST", "SUPPORT"];

export const ORG_PERMISSIONS = {
  "org.view": everyone,
  "org.manage": admins,
  "org.delete": owner,
  "team.view": everyone,
  "team.manage": admins,
  "billing.view": admins,
  "billing.manage": owner,
  "meta.view": everyone,
  "meta.manage": admins,
  "meta.credentials": admins,
  "contacts.view": everyone,
  "contacts.write": operators,
  "contacts.import": operators,
  "contacts.export": admins,
  "lists.view": everyone,
  "lists.write": operators,
  "templates.view": everyone,
  "templates.write": operators,
  "campaigns.view": everyone,
  "campaigns.write": operators,
  "campaigns.control": operators,
  "inbox.view": everyone,
  "inbox.write": ["OWNER", "ADMIN", "OPERATOR", "SUPPORT"],
  "automations.view": everyone,
  "automations.write": admins,
  "analytics.view": everyone,
  "diagnostics.view": everyone,
  "audit.view": admins,
} satisfies Record<string, OrgRole[]>;

export type OrgPermission = keyof typeof ORG_PERMISSIONS;

export function canOrg(role: OrgRole | null | undefined, permission: OrgPermission): boolean {
  if (!role) return false;
  return (ORG_PERMISSIONS[permission] as OrgRole[]).includes(role);
}

/** Perfis que um membro pode atribuir a outro: ninguém promove acima do próprio nível. */
export function assignableRoles(actor: OrgRole): OrgRole[] {
  if (actor === "OWNER") return ORG_ROLES;
  if (actor === "ADMIN") return ["ADMIN", "OPERATOR", "ANALYST", "SUPPORT"];
  return [];
}
