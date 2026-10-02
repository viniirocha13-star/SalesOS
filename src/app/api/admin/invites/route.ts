import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";
import { createMagicInvite, InviteError, inviteStatus } from "@/lib/invite";

export async function GET() {
  try {
    await requirePermission("admin.users");
    const invites = await prisma.invite.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { createdBy: { select: { email: true, name: true } } },
    });
    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
        createdBy: invite.createdBy.email,
        status: inviteStatus(invite),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("admin.users");
    const body = await request.json();
    const { invite, url } = await createMagicInvite({
      actorId: actor.id,
      role: body.role,
      email: body.email,
      name: body.name,
    });
    await audit({
      actorId: actor.id,
      action: "invite.create",
      entity: "Invite",
      entityId: invite.id,
      metadata: { role: invite.role, email: invite.email },
    });
    return NextResponse.json({
      id: invite.id,
      url,
      role: invite.role,
      email: invite.email,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return errorResponse(error);
  }
}
