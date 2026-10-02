import { NextResponse } from "next/server";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";
import { InviteError, revokeMagicInvite } from "@/lib/invite";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requirePermission("admin.users");
    const { id } = await context.params;
    const invite = await revokeMagicInvite(id);
    await audit({
      actorId: actor.id,
      action: "invite.revoke",
      entity: "Invite",
      entityId: invite.id,
    });
    return NextResponse.json({ id: invite.id, status: "revoked" });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return errorResponse(error);
  }
}
