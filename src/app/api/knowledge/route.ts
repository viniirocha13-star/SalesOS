import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("knowledge.write");
    const body = await request.json();
    const doc = await prisma.knowledgeDocument.create({
      data: {
        title: body.title,
        type: body.type,
        content: body.content,
        approved: true,
        active: true,
        createdById: user.id,
        versions: { create: { version: 1, content: body.content } },
      },
    });
    await audit({ actorId: user.id, action: "knowledge.create", entity: "KnowledgeDocument", entityId: doc.id });
    return NextResponse.json(doc);
  } catch (error) {
    return errorResponse(error);
  }
}
