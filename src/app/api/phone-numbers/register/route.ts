import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { badRequest, notFound, readJson, withApi } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { getDecryptedToken } from "@/wa/meta-connection";
import {
  registerPhoneNumber,
  requestPhoneVerificationCode,
  verifyPhoneCode,
} from "@/integrations/meta/graph";

const schema = z.object({
  phoneNumberId: z.string().min(1), // db id
  action: z.enum(["register", "request_code", "verify_code"]),
  pin: z.string().optional(),
  code: z.string().optional(),
  method: z.enum(["SMS", "VOICE"]).optional(),
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("meta.manage");
  const body = schema.parse(await readJson(request));
  const phone = await prisma.phoneNumber.findFirst({
    where: { id: body.phoneNumberId, organizationId: ctx.organization.id },
  });
  if (!phone) throw notFound("Número");

  const token = await getDecryptedToken(ctx.organization.id);
  if (!token) throw badRequest("Conecte a Meta antes de registrar o número.");

  try {
    if (body.action === "request_code") {
      await requestPhoneVerificationCode(token, phone.phoneNumberId, body.method ?? "SMS");
      await prisma.phoneNumber.update({
        where: { id: phone.id },
        data: { status: "VERIFICATION_PENDING", lastError: null },
      });
      return NextResponse.json({ ok: true, message: "Código enviado. Digite o código recebido no WhatsApp/SMS." });
    }

    if (body.action === "verify_code") {
      if (!body.code) throw badRequest("Informe o código recebido.");
      await verifyPhoneCode(token, phone.phoneNumberId, body.code);
      await prisma.phoneNumber.update({
        where: { id: phone.id },
        data: { status: "CONNECTING", codeVerificationStatus: "VERIFIED", lastError: null },
      });
      return NextResponse.json({ ok: true, message: "Código confirmado. Agora registre o número com o PIN de 6 dígitos." });
    }

    // register
    if (!body.pin || !/^\d{6}$/.test(body.pin)) {
      throw badRequest("Informe um PIN de 6 dígitos para registrar o número na Cloud API.");
    }
    await registerPhoneNumber(token, phone.phoneNumberId, body.pin);
    await prisma.phoneNumber.update({
      where: { id: phone.id },
      data: { status: "CONNECTED", lastError: null, lastSyncedAt: new Date() },
    });
    await audit({
      actorId: ctx.user.id,
      organizationId: ctx.organization.id,
      action: "phone.register",
      entity: "PhoneNumber",
      entityId: phone.id,
    });
    return NextResponse.json({ ok: true, message: "Número registrado e conectado." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na operação do número.";
    await prisma.phoneNumber.update({
      where: { id: phone.id },
      data: { status: "ERROR", lastError: message },
    });
    throw badRequest(message);
  }
});
