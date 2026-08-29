import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("admin.users");
    const body = await request.json();
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: String(body.email).toLowerCase(),
        role: body.role,
        passwordHash: await bcrypt.hash(body.password || "Brisa@2026", 10),
      },
    });
    await audit({ actorId: actor.id, action: "user.create", entity: "User", entityId: user.id });
    return NextResponse.json({ id: user.id });
  } catch (error) {
    return errorResponse(error);
  }
}
