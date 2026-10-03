import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logError } from "@/lib/logger";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "ERROR", details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const unauthenticated = () => new ApiError(401, "Não autenticado", "UNAUTHENTICATED");
export const forbidden = (msg = "Sem permissão para esta ação") => new ApiError(403, msg, "FORBIDDEN");
export const notFound = (what = "Registro") => new ApiError(404, `${what} não encontrado`, "NOT_FOUND");
export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, "BAD_REQUEST", details);
export const conflict = (msg: string) => new ApiError(409, msg, "CONFLICT");
export const noOrganization = () =>
  new ApiError(412, "Nenhuma organização ativa. Conclua o onboarding.", "NO_ORGANIZATION");

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details ?? undefined },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Dados inválidos",
        code: "VALIDATION",
        details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  const status = (error as { status?: number })?.status;
  if (status === 401) return NextResponse.json({ error: "Não autenticado", code: "UNAUTHENTICATED" }, { status });
  if (status === 403) return NextResponse.json({ error: "Sem permissão", code: "FORBIDDEN" }, { status });
  logError("api.unhandled", { message: error instanceof Error ? error.message : String(error) });
  return NextResponse.json({ error: "Erro interno", code: "INTERNAL" }, { status: 500 });
}

/** Envolve um handler de rota para padronizar erros. */
export function withApi<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw badRequest("JSON inválido");
  }
}
