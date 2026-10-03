import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { listGroups } from "@/lib/repositories/plim/groups";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { ConversorTestForm } from "@/components/plim/conversor-test-form";

export default async function PlimConversorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const groups = await listGroups(ctx.tenantId);

  return (
    <PlimSection title="Conversor de Links" description="Conversão por adaptador de marketplace com sub-id do grupo quando suportado.">
      <div className={plimCardClass()}>
        <ConversorTestForm groups={groups.map((g) => ({ id: g.id, name: g.name, externalId: g.externalId }))} />
      </div>
    </PlimSection>
  );
}
