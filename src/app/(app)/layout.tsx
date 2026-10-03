import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PlimAppShell } from "@/components/plim/plim-app-shell";
import type { Role } from "@prisma/client";
import { getPlimContext, ensurePlimSettings } from "@/lib/plim/tenant-context";
import { resolvePlimProfile } from "@/lib/plim/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const settings = await ensurePlimSettings(ctx.tenantId);
  const profile = resolvePlimProfile(session.user.role as Role, ctx.user.plimProfile);

  return (
    <PlimAppShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role as Role }}
      plimProfile={profile}
      testMode={settings.testMode}
    >
      {children}
    </PlimAppShell>
  );
}
