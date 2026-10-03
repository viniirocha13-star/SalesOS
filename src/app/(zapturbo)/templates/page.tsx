import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TemplateSyncButton } from "@/components/template-sync-button";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function TemplatesPage() {
  const ctx = await requireOrg("templates.view");
  const templates = await prisma.messageTemplate.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="WhatsApp Business"
        title="Modelos de mensagem"
        description="Sincronize templates da Meta. Categorias oficiais: Marketing, Utilidade e Autenticação."
        action={<TemplateSyncButton />}
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-3 py-3">Categoria</th>
              <th className="px-3 py-3">Solicitada</th>
              <th className="px-3 py-3">Idioma</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3">Qualidade</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  Nenhum template. Conecte a Meta e sincronize, ou{" "}
                  <Link href="/templates/new" className="text-[#148a52] hover:underline">
                    crie um modelo
                  </Link>
                  .
                </td>
              </tr>
            )}
            {templates.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium">{t.name}</td>
                <td className="px-3 py-3">
                  {t.category}
                  {t.previousCategory && t.previousCategory !== t.category && (
                    <span className="ml-1 text-[10px] text-amber-700">recategorizado</span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-500">{t.requestedCategory ?? "—"}</td>
                <td className="px-3 py-3">{t.language}</td>
                <td className="px-3 py-3">{t.status}</td>
                <td className="px-5 py-3 text-slate-500">{t.quality ?? t.rejectedReason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
