import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { acceptMagicInvite, InviteError } from "@/lib/invite";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`invite:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Espere um minuto." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { user, invite } = await acceptMagicInvite({
      secret: String(body.token ?? ""),
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });
    await audit({
      actorId: user.id,
      action: "invite.accept",
      entity: "Invite",
      entityId: invite.id,
      metadata: { email: user.email, role: user.role },
      ip,
    });
    return NextResponse.json({ ok: true, email: user.email });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Não foi possível aceitar o convite." }, { status: 500 });
  }
}
