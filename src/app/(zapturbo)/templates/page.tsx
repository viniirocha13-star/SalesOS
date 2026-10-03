import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
        action={
          <div className="flex gap-2">
            <form action="/api/templates/sync" method="post">
              <Link
                href="/templates?sync=1"
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
              >
                Sincronizar
              </Link>
            </form>
            <Link
              href="/templates/new"
              className="inline-flex h-10 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white hover:bg-[#18965c]"
            >
              Novo modelo
            </Link>
          </div>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-3 py-3">Categoria</th>
              <th className="px-3 py-3">Idioma</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3">Qualidade</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
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
                <td className="px-3 py-3">{t.category}</td>
                <td className="px-3 py-3">{t.language}</td>
                <td className="px-3 py-3">{t.status}</td>
                <td className="px-5 py-3 text-slate-500">{t.quality ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
