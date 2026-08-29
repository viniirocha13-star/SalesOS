import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw Object.assign(new Error("UNAUTHENTICATED"), { status: 401 });
  }
  return session.user;
}

export async function requirePermission(permission: string) {
  const user = await requireUser();
  if (!can(user.role as Role, permission)) {
    throw Object.assign(new Error("FORBIDDEN"), { status: 403 });
  }
  return user;
}

export function errorResponse(error: unknown) {
  const status = (error as { status?: number }).status ?? 500;
  const message =
    status === 401 ? "Não autenticado" : status === 403 ? "Sem permissão" : "Erro interno";
  return NextResponse.json({ error: message }, { status });
}
