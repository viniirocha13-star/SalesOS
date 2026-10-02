import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { acceptMagicInvite, createMagicInvite, lookupInviteBySecret, revokeMagicInvite } from "@/lib/invite";

describe("convite mágico no banco", () => {
  it("cria, aceita uma vez e recusa reuso", async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "ursula.b@example.com" } });
    const email = `convite.${Date.now()}@brisa.test`;
    const { secret, invite } = await createMagicInvite({
      actorId: admin.id,
      role: "OPERADOR",
      email,
      name: "Novo Operador",
    });

    const found = await lookupInviteBySecret(secret);
    expect(found.id).toBe(invite.id);

    const accepted = await acceptMagicInvite({
      secret,
      name: "Novo Operador",
      email,
      password: "senha-forte-10",
    });
    expect(accepted.user.email).toBe(email);
    expect(accepted.user.role).toBe("OPERADOR");

    await expect(acceptMagicInvite({ secret, name: "Outro", email: `x${email}`, password: "senha-forte-10" })).rejects.toThrow(
      /inválido ou expirado/i,
    );
  });

  it("não aceita convite revogado", async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "ursula.b@example.com" } });
    const email = `revogado.${Date.now()}@brisa.test`;
    const { secret, invite } = await createMagicInvite({
      actorId: admin.id,
      role: "ANALISTA",
      email,
    });
    await revokeMagicInvite(invite.id);
    await expect(
      acceptMagicInvite({ secret, name: "Revogado", email, password: "senha-forte-10" }),
    ).rejects.toThrow(/inválido ou expirado/i);
  });
});
