import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

const ROOT = process.env.PLIM_STORAGE_LOCAL_DIR ?? path.join(process.cwd(), ".plim-storage");

export async function GET(_request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { path: parts } = await ctx.params;
  if (!parts?.length) return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  const rel = parts.join("/");
  const full = path.join(ROOT, rel.replace(/\.\./g, ""));
  try {
    const data = await readFile(full);
    return new NextResponse(data, { headers: { "Content-Type": "image/png" } });
  } catch {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
}
