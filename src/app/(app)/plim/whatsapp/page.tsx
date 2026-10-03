import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { prisma } from "@/lib/prisma";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { ChannelTestButton } from "@/components/plim/channel-test-button";

export default async function PlimWhatsappPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const conn = await prisma.plimChannelConnection.findFirst({
    where: { tenantId: ctx.tenantId, platform: "WHATSAPP" },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <PlimSection title="WhatsApp" description="Meta Cloud API via integração oficial existente.">
      <div className={plimCardClass()}>
        <p>Status: <strong>{conn?.status ?? "DISCONNECTED"}</strong></p>
        {conn?.sendsPaused && <p className="text-amber-700 text-sm">Envios pausados: {conn.lastError}</p>}
        <ChannelTestButton platform="WHATSAPP" />
      </div>
    </PlimSection>
  );
}
