import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { EmBreve } from "@/components/plim/em-breve";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { ChannelTestButton } from "@/components/plim/channel-test-button";

export default async function PlimInstagramPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await getPlimContext(session.user.id, session.user.role as Role);

  return (
    <PlimSection title="Instagram">
      <div className={plimCardClass()}>
        <p className="text-sm text-slate-600">Teste de conexão Meta quando credenciais estiverem disponíveis.</p>
        <ChannelTestButton platform="INSTAGRAM" />
      </div>
      <EmBreve title="Publicação automática Instagram" />
    </PlimSection>
  );
}
