import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import type { Role } from "@prisma/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [queueCount, inboxCount, wa] = await Promise.all([
    prisma.preSale.count({ where: { status: { in: ["PRONTA", "PENDENCIA"] } } }),
    prisma.conversation.count({ where: { status: { in: ["IA_ATIVA", "HANDOFF_HUMANO"] } } }),
    prisma.integration.findFirst({ where: { slug: "whatsapp" } }),
  ]);
  const whatsapp =
    wa?.status === "CONNECTED" || process.env.WHATSAPP_PROVIDER === "meta"
      ? "connected"
      : wa?.status === "ERROR"
        ? "error"
        : "mock";
  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role as Role }}
      queueCount={queueCount}
      inboxCount={inboxCount}
      whatsapp={whatsapp}
    >
      {children}
    </AppShell>
  );
}
