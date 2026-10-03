import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { prisma } from "@/lib/prisma";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { ChannelTestButton } from "@/components/plim/channel-test-button";

export default async function PlimTelegramPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const conn = await prisma.plimChannelConnection.findFirst({
    where: { tenantId: ctx.tenantId, platform: "TELEGRAM" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <PlimSection title="Telegram" description="Bot API oficial quando TELEGRAM_BOT_TOKEN está definido.">
      <div className={plimCardClass()}>
        <p>Token: {configured ? "configurado" : "não configurado"}</p>
        <p>Status conexão: {conn?.status ?? "DISCONNECTED"}</p>
        <ChannelTestButton platform="TELEGRAM" />
      </div>
    </PlimSection>
  );
}
