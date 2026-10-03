import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { prisma } from "@/lib/prisma";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { ChannelTestButton } from "@/components/plim/channel-test-button";

export default async function PlimIntegracoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const connections = await prisma.plimChannelConnection.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { platform: "asc" },
  });

  return (
    <PlimSection title="Integrações" description="Contas e conexões PLIM por canal.">
      <div className="grid gap-3 md:grid-cols-3">
        {(["WHATSAPP", "TELEGRAM", "INSTAGRAM"] as const).map((platform) => {
          const conn = connections.find((c) => c.platform === platform);
          return (
            <div key={platform} className={plimCardClass()}>
              <h2 className="font-medium">{platform}</h2>
              <p className="text-sm text-slate-500">{conn?.status ?? "DISCONNECTED"}</p>
              <ChannelTestButton platform={platform} />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Webhook de ofertas: POST /api/plim/ofertas/webhook (header Bearer PLIM_WEBHOOK_SECRET)</p>
    </PlimSection>
  );
}
