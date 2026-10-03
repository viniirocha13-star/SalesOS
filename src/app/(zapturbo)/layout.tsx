import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOptionalOrgContext } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { ZapTurboShell } from "@/components/zapturbo-shell";

export default async function ZapTurboLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const ctx = await getOptionalOrgContext();
  if (!ctx) redirect("/onboarding");

  const [subscription, usage, meta] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: ctx.organization.id },
      include: { plan: true },
    }),
    prisma.usageRecord.findFirst({
      where: {
        organizationId: ctx.organization.id,
        metric: "messages",
        periodStart: { lte: new Date() },
        periodEnd: { gte: new Date() },
      },
      orderBy: { periodStart: "desc" },
    }),
    prisma.metaConnection.findUnique({ where: { organizationId: ctx.organization.id } }),
  ]);

  return (
    <ZapTurboShell
      user={{ name: session.user.name, email: session.user.email }}
      organization={ctx.organization}
      memberships={ctx.memberships.map((m) => ({ organizationId: m.organizationId, name: m.name }))}
      plan={{
        name: subscription?.plan.name ? `Plano ${subscription.plan.name}` : "Plano Starter",
        used: usage?.quantity ?? 0,
        limit: subscription?.plan.maxMessagesPerMonth ?? 5000,
      }}
      metaConnected={meta?.status === "CONNECTED"}
    >
      {children}
    </ZapTurboShell>
  );
}
