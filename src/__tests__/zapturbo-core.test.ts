import { describe, expect, it } from "vitest";
import { CredentialVault } from "@/lib/credential-vault";
import { canOrg, assignableRoles } from "@/lib/org-rbac";
import { parseCsvContacts } from "@/wa/contact-import";
import { normalizePhone } from "@/lib/phone";

describe("CredentialVault", () => {
  it("criptografa e descriptografa", () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const token = "EAAB-test-token-sensitive";
    const enc = CredentialVault.encrypt(token);
    expect(enc).not.toContain(token);
    expect(CredentialVault.decrypt(enc)).toBe(token);
    expect(CredentialVault.validate(enc)).toBe(true);
  });

  it("revoke invalida o token útil", () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const revoked = CredentialVault.revoke();
    expect(CredentialVault.validate(revoked)).toBe(false);
  });
});

describe("Org RBAC", () => {
  it("operador cria campanha mas não gerencia Meta", () => {
    expect(canOrg("OPERATOR", "campaigns.write")).toBe(true);
    expect(canOrg("OPERATOR", "meta.manage")).toBe(false);
    expect(canOrg("SUPPORT", "meta.credentials")).toBe(false);
    expect(canOrg("ANALYST", "analytics.view")).toBe(true);
  });

  it("admin não promove a owner", () => {
    expect(assignableRoles("ADMIN")).not.toContain("OWNER");
    expect(assignableRoles("OWNER")).toContain("OWNER");
  });
});

describe("Importação CSV", () => {
  it("normaliza telefones BR e detecta cabeçalho", () => {
    const rows = parseCsvContacts("Nome,Telefone\nMaria,85999999999\nJoão,+55 85 98888-7777");
    expect(rows).toHaveLength(2);
    expect(normalizePhone(rows[0].phone)).toBe("+5585999999999");
    expect(normalizePhone(rows[1].phone)).toBe("+5585988887777");
  });
});
