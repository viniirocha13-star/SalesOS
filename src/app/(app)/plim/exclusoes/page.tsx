import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listExclusions } from "@/lib/repositories/plim/analytics";
import { ExclusoesForm } from "@/components/plim/exclusoes-form";

export default async function PlimExclusoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const exclusions = await listExclusions(ctx.tenantId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Exclusões</h1>
        <p className="text-sm text-slate-500">
          Opt-out por telefone (PlimExclusion). Contatos excluídos não podem ser reimportados até remover o opt-out.
        </p>
      </div>
      <ExclusoesForm canWrite={canPlimWrite(ctx.profile)} exclusions={exclusions} />
    </div>
  );
}
