import { z } from "zod";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { badRequest, conflict, readJson, withApi } from "@/lib/api-error";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(72),
});

export const POST = withApi(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "register";
  if (!rateLimit(`register:${ip}`, 8, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  const body = schema.parse(await readJson(request));
  const email = body.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("Já existe uma conta com este e-mail.");

  if (body.password.length < 8) throw badRequest("A senha precisa ter pelo menos 8 caracteres.");

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email,
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  await audit({
    actorId: user.id,
    action: "user.register",
    entity: "User",
    entityId: user.id,
    ip,
  });

  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email },
    next: "/login?from=/onboarding",
  });
});
