import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { prisma } from "@/lib/prisma";
import { EmBreve } from "@/components/plim/em-breve";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { ChannelTestButton } from "@/components/plim/channel-test-button";

export default async function PlimInstagramPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const conn = await prisma.plimChannelConnection.findFirst({
    where: { tenantId: ctx.tenantId, platform: "INSTAGRAM" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <PlimSection title="Instagram" description="API oficial Meta — feed e teste de conexão.">
      <div className={plimCardClass()}>
        <p>Status: <strong>{conn?.status ?? "DISCONNECTED"}</strong></p>
        {conn?.lastError && <p className="text-sm text-amber-800">{conn.lastError}</p>}
        <ChannelTestButton platform="INSTAGRAM" />
      </div>
      <EmBreve
        title="Stories, Reels e Direct automáticos"
        description="Não disponíveis via API pública nesta versão. Configure token em Configurações → Instagram."
      />
    </PlimSection>
  );
}
