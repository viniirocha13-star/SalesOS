import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
export const MIN_INVITE_PASSWORD_LENGTH = 10;
export const INVITABLE_ROLES = ["ADMIN", "SUPERVISOR", "OPERADOR", "ANALISTA"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export type InviteStatus = "pending" | "used" | "expired" | "revoked";

export class InviteError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function generateInviteSecret() {
  return randomBytes(32).toString("base64url");
}

export function hashInviteSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function appBaseUrl() {
  return (process.env.APP_URL || process.env.AUTH_URL || "http://127.0.0.1:43147").replace(/\/$/, "");
}

export function inviteUrl(secret: string) {
  return `${appBaseUrl()}/convite/${encodeURIComponent(secret)}`;
}

export function parseInvitableRole(role: unknown): InvitableRole {
  const value = String(role ?? "").toUpperCase();
  if ((INVITABLE_ROLES as readonly string[]).includes(value)) return value as InvitableRole;
  throw new InviteError("Perfil inválido para convite.", "INVALID_ROLE", 400);
}

export function normalizeInviteEmail(email: unknown) {
  const value = String(email ?? "").trim().toLowerCase();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new InviteError("E-mail inválido.", "INVALID_EMAIL", 400);
  }
  return value;
}

export function validateInvitePassword(password: string) {
  if (password.length < MIN_INVITE_PASSWORD_LENGTH) {
    throw new InviteError(`A senha precisa ter pelo menos ${MIN_INVITE_PASSWORD_LENGTH} caracteres.`, "WEAK_PASSWORD", 400);
  }
  if (/\s/.test(password)) {
    throw new InviteError("A senha não pode ter espaços.", "WEAK_PASSWORD", 400);
  }
}

export function inviteStatus(invite: {
  usedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  now?: Date;
}): InviteStatus {
  if (invite.revokedAt) return "revoked";
  if (invite.usedAt) return "used";
  if (invite.expiresAt.getTime() <= (invite.now ?? new Date()).getTime()) return "expired";
  return "pending";
}

export async function createMagicInvite(input: {
  actorId: string;
  role: unknown;
  email?: unknown;
  name?: unknown;
}) {
  const role = parseInvitableRole(input.role);
  const email = input.email ? normalizeInviteEmail(input.email) : null;
  const name = String(input.name ?? "").trim() || null;
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new InviteError("Já existe um usuário com este e-mail.", "EMAIL_TAKEN", 409);
  }

  const secret = generateInviteSecret();
  const invite = await prisma.invite.create({
    data: {
      email,
      name,
      role: role as Role,
      tokenHash: hashInviteSecret(secret),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      createdById: input.actorId,
    },
  });

  return { invite, secret, url: inviteUrl(secret) };
}

export async function lookupInviteBySecret(secret: string) {
  const tokenHash = hashInviteSecret(secret);
  const invite = await prisma.invite.findUnique({ where: { tokenHash } });
  if (!invite) throw new InviteError("Convite inválido ou expirado.", "INVALID_INVITE", 404);
  const status = inviteStatus(invite);
  if (status !== "pending") {
    throw new InviteError("Convite inválido ou expirado.", "INVALID_INVITE", 410);
  }
  return invite;
}

export async function acceptMagicInvite(input: {
  secret: string;
  name: string;
  email: string;
  password: string;
}) {
  const name = String(input.name ?? "").trim();
  if (name.length < 2) throw new InviteError("Informe o nome.", "INVALID_NAME", 400);
  const email = normalizeInviteEmail(input.email);
  if (!email) throw new InviteError("Informe o e-mail.", "INVALID_EMAIL", 400);
  validateInvitePassword(input.password);

  const invite = await lookupInviteBySecret(input.secret);
  if (invite.email && invite.email !== email) {
    throw new InviteError("Este convite é para outro e-mail.", "EMAIL_MISMATCH", 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new InviteError("Já existe um usuário com este e-mail.", "EMAIL_TAKEN", 409);

  const creator = await prisma.user.findUnique({ where: { id: invite.createdById } });
  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const claimed = await tx.invite.updateMany({
      where: { id: invite.id, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new InviteError("Convite inválido ou expirado.", "INVALID_INVITE", 410);
    }
    return tx.user.create({
      data: {
        name,
        email,
        role: invite.role,
        passwordHash,
        tenantId: creator?.tenantId,
        active: true,
      },
    });
  });

  return { user, invite };
}

export async function revokeMagicInvite(id: string) {
  const invite = await prisma.invite.findUnique({ where: { id } });
  if (!invite) throw new InviteError("Convite não encontrado.", "NOT_FOUND", 404);
  if (inviteStatus(invite) !== "pending") {
    throw new InviteError("Este convite já não está pendente.", "NOT_PENDING", 409);
  }
  return prisma.invite.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}
