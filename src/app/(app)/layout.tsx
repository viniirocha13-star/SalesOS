import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import type { Role } from "@prisma/client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const queueCount = await prisma.preSale.count({ where: { status: { in: ["PRONTA", "PENDENCIA"] } } });
  return (
    <AppShell user={{ name: session.user.name, email: session.user.email, role: session.user.role as Role }} queueCount={queueCount}>
      {children}
    </AppShell>
  );
}
