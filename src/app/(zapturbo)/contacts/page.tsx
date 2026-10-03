import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function ContactsPage() {
  const ctx = await requireOrg("contacts.view");
  const contacts = await prisma.contact.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const total = await prisma.contact.count({ where: { organizationId: ctx.organization.id } });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker={`${total} contatos`}
        title="Contatos"
        description="Base própria e autorizada. Telefones normalizados em E.164. Opt-outs bloqueiam campanhas automaticamente."
        action={
          <div className="flex gap-2">
            <Link
              href="/lists"
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
            >
              Listas
            </Link>
            <Link
              href="/contacts/import"
              className="inline-flex h-10 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white hover:bg-[#18965c]"
            >
              Importar
            </Link>
          </div>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-3 py-3">Telefone</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Origem</th>
              <th className="px-5 py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                  Nenhum contato.{" "}
                  <Link href="/contacts/import" className="text-[#148a52] hover:underline">
                    Importe uma lista autorizada
                  </Link>
                  .
                </td>
              </tr>
            )}
            {contacts.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium">{c.name ?? "—"}</td>
                <td className="px-3 py-3 tabular-nums">{c.phoneE164}</td>
                <td className="px-3 py-3">{c.status}</td>
                <td className="px-3 py-3 text-slate-500">{c.source ?? "—"}</td>
                <td className="px-5 py-3 text-slate-500">{c.createdAt.toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
