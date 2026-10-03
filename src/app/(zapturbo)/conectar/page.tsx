import { redirect } from "next/navigation";

/** Atalho do menu "Conectar WhatsApp" → fluxo Meta. */
export default function ConectarPage() {
  redirect("/settings/meta");
}
