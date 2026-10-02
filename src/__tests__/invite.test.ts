import { describe, expect, it } from "vitest";
import {
  generateInviteSecret,
  hashInviteSecret,
  inviteStatus,
  inviteUrl,
  parseInvitableRole,
  validateInvitePassword,
  InviteError,
} from "@/lib/invite";

describe("convite mágico", () => {
  it("gera secret e hash distintos e estáveis", () => {
    const secret = generateInviteSecret();
    expect(secret.length).toBeGreaterThan(20);
    expect(hashInviteSecret(secret)).toBe(hashInviteSecret(secret));
    expect(hashInviteSecret(secret)).not.toBe(secret);
    expect(hashInviteSecret(secret)).not.toBe(hashInviteSecret(secret + "x"));
  });

  it("monta URL pública", () => {
    expect(inviteUrl("abc")).toMatch(/\/convite\/abc$/);
  });

  it("aceita só perfis convidáveis", () => {
    expect(parseInvitableRole("operador")).toBe("OPERADOR");
    expect(() => parseInvitableRole("SUPER_ADMIN")).toThrow(InviteError);
  });

  it("rejeita senha fraca", () => {
    expect(() => validateInvitePassword("curta")).toThrow(InviteError);
    expect(() => validateInvitePassword("tem espaço1")).toThrow(InviteError);
    expect(() => validateInvitePassword("senha-ok-10")).not.toThrow();
  });

  it("classifica estado do convite", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    expect(
      inviteStatus({ usedAt: null, revokedAt: null, expiresAt: new Date("2026-10-03T12:00:00Z"), now }),
    ).toBe("pending");
    expect(
      inviteStatus({ usedAt: now, revokedAt: null, expiresAt: new Date("2026-10-03T12:00:00Z"), now }),
    ).toBe("used");
    expect(
      inviteStatus({ usedAt: null, revokedAt: now, expiresAt: new Date("2026-10-03T12:00:00Z"), now }),
    ).toBe("revoked");
    expect(
      inviteStatus({ usedAt: null, revokedAt: null, expiresAt: new Date("2026-10-01T12:00:00Z"), now }),
    ).toBe("expired");
  });
});
