import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listContacts } from "@/lib/repositories/plim/analytics";
import { PlimFileImport } from "@/components/plim/plim-file-import";
import { importContactsFile } from "@/app/(app)/plim/analytics-actions";

export default async function PlimContatosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const contacts = await listContacts(ctx.tenantId);
  const canImport = canPlimWrite(ctx.profile);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Contatos</h1>
        <p className="text-sm text-slate-500">Importação para PlimContact com consentimento e vínculo de grupo.</p>
      </div>

      <PlimFileImport
        accept=".csv,.xlsx,.xls,.txt,.vcf"
        label="Importar contatos (CSV, XLSX, TXT ou VCF)"
        disabled={!canImport}
        onImport={importContactsFile}
      />

      <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-violet-50 text-xs uppercase text-violet-800">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Origem</th>
              <th className="px-3 py-2">Importado</th>
              <th className="px-3 py-2">Grupo</th>
              <th className="px-3 py-2">Consentimento</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.name ?? "—"}</td>
                <td className="px-3 py-2">{c.phone}</td>
                <td className="px-3 py-2">{c.source ?? "—"}</td>
                <td className="px-3 py-2">{new Date(c.importedAt).toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2">{c.group?.name ?? "—"}</td>
                <td className="px-3 py-2">{c.consent ? "Sim" : "Não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!contacts.length && <p className="p-4 text-slate-500">Nenhum contato importado.</p>}
      </div>
    </div>
  );
}
