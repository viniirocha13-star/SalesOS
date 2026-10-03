import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listGroups } from "@/lib/repositories/plim/groups";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { removeGroupForm, saveGroupForm } from "@/app/(app)/plim/operacao-actions";

export default async function PlimGruposPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const groups = await listGroups(ctx.tenantId);
  const canWrite = canPlimWrite(ctx.profile);

  return (
    <PlimSection title="Grupos e Canais" description="CRUD de grupos origem/destino com limites e intervalos.">
      <div className={plimCardClass()}>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500"><th>Nome</th><th>Plataforma</th><th>Papel</th><th>Sub-id</th><th>Status</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="py-2">{g.name}</td>
                <td>{g.platform}</td>
                <td>{g.groupRole}</td>
                <td className="font-mono text-xs">{g.externalId ?? "—"}</td>
                <td>{g.active ? "Ativo" : "Inativo"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canWrite && (
        <form action={saveGroupForm} className={plimCardClass()}>
          <h2 className="font-medium">Novo / editar grupo</h2>
          <input type="hidden" name="id" />
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input name="name" placeholder="Nome" required className="rounded border px-2 py-1.5" />
            <select name="platform" className="rounded border px-2 py-1.5">
              {["WHATSAPP", "TELEGRAM", "INSTAGRAM", "EXTERNO"].map((p) => <option key={p}>{p}</option>)}
            </select>
            <select name="groupRole" className="rounded border px-2 py-1.5">
              <option value="DESTINO">DESTINO</option>
              <option value="ORIGEM">ORIGEM</option>
            </select>
            <input name="externalId" placeholder="Identificador / sub-id" className="rounded border px-2 py-1.5" />
            <input name="niche" placeholder="Nicho" className="rounded border px-2 py-1.5" />
            <input name="memberCount" type="number" placeholder="Membros" className="rounded border px-2 py-1.5" />
            <input name="accountLabel" placeholder="Conta" className="rounded border px-2 py-1.5" />
            <input name="activeFrom" placeholder="Horário início (HH:mm)" className="rounded border px-2 py-1.5" />
            <input name="activeTo" placeholder="Horário fim" className="rounded border px-2 py-1.5" />
            <input name="dailyLimit" type="number" placeholder="Limite diário" className="rounded border px-2 py-1.5" />
            <input name="minIntervalSec" type="number" placeholder="Intervalo mínimo (s)" className="rounded border px-2 py-1.5" />
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="isMasterHub" /> Grupo mestre público (/grupos)</label>
            <input name="publicSlug" placeholder="Slug público (ex: promos-fortaleza)" className="rounded border px-2 py-1.5" />
            <input name="publicRedirectUrl" placeholder="URL de entrada (WhatsApp/Telegram)" className="rounded border px-2 py-1.5" />
            <input name="memberLimit" type="number" placeholder="Limite de entradas públicas" className="rounded border px-2 py-1.5" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Ativo</label>
          </div>
          <p className="mt-2 text-xs text-slate-500">Hub público: /grupos e /grupos/[slug] — registra clique e redireciona.</p>
          <button type="submit" className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar</button>
        </form>
      )}
      {canWrite && groups.length > 0 && (
        <form action={removeGroupForm} className="text-sm text-slate-500">
          <select name="id" className="rounded border px-2 py-1">{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <button type="submit" className="ml-2 text-red-600">Excluir selecionado</button>
        </form>
      )}
    </PlimSection>
  );
}
