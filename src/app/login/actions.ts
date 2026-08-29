"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/dashboard");
  const dest =
    from.startsWith("/") && !from.startsWith("//") && from !== "/login" ? from : "/dashboard";
  try {
    await signIn("credentials", { email, password, redirectTo: dest });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) return "E-mail ou senha inválidos.";
    return "E-mail ou senha inválidos.";
  }
}
