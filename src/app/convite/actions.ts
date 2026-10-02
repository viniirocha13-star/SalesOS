"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { acceptMagicInvite, InviteError } from "@/lib/invite";
import { rateLimit } from "@/lib/rate-limit";

export async function acceptInviteAction(_prev: string, formData: FormData) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`invite:${ip}`, 10, 60_000)) {
    return "Muitas tentativas. Espere um minuto.";
  }
  try {
    const { user, invite } = await acceptMagicInvite({
      secret: String(formData.get("token") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    await audit({
      actorId: user.id,
      action: "invite.accept",
      entity: "Invite",
      entityId: invite.id,
      metadata: { email: user.email, role: user.role },
      ip,
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof InviteError) return error.message;
    return "Não foi possível aceitar o convite.";
  }
  redirect("/login?convite=ok");
}
