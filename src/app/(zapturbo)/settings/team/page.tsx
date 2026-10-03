import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { ORG_ROLE_LABEL } from "@/lib/org-rbac";

export default async function TeamSettingsPage() {
  const ctx = await requireOrg("team.view");
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.organization.id },
    include: { user: { select: { id: true, name: true, email: true, active: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="ZapTurbo"
        title="Equipe"
        description="Perfis: Proprietário, Admin, Operador, Analista e Suporte. Permissões validadas no backend."
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3">Membro</th>
              <th className="px-3 py-3">Perfil</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-5 py-3">
                  <div className="font-medium">{m.user.name}</div>
                  <div className="text-slate-400">{m.user.email}</div>
                </td>
                <td className="px-3 py-3">{ORG_ROLE_LABEL[m.role]}</td>
                <td className="px-5 py-3">{m.user.active ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
