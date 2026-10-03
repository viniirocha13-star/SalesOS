import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { PlimProfile, Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { getWorkspaceSettings, listWorkspaceMembers } from "@/lib/repositories/plim/settings";
import { canPlimAdmin } from "@/lib/plim/profile";
import { savePlimBrand, savePlimGeneral, savePlimUserProfile } from "@/app/(app)/plim/actions";
import { EmBreve } from "@/components/plim/em-breve";
import { getStorageProvider } from "@/lib/storage";

const TABS = ["Geral", "Marca", "Afiliados", "WhatsApp", "Telegram", "Instagram", "IA", "Tracking", "Usuários"] as const;

export default async function PlimConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const settings = await getWorkspaceSettings(ctx.tenantId);
  const members = await listWorkspaceMembers(ctx.tenantId);
  const sp = await searchParams;
  const tab = TABS.includes((sp.tab as typeof TABS[number]) ?? "Geral") ? (sp.tab as string) : "Geral";
  const isAdmin = canPlimAdmin(ctx.profile);
  const logoUrl = settings.logoPath ? getStorageProvider().getPublicUrl(settings.logoPath) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Configurações</h1>
        <p className="text-sm text-slate-500">Preferências do workspace PLIM persistidas no banco.</p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/plim/configuracoes?tab=${encodeURIComponent(t)}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t ? "bg-violet-600 text-white" : "bg-white text-slate-600 ring-1 ring-violet-100"
            }`}
          >
            {t}
          </a>
        ))}
      </nav>

      {tab === "Geral" && (
        <form action={savePlimGeneral} className="max-w-lg space-y-4 rounded-2xl border border-violet-100 bg-white p-5">
          <fieldset disabled={!isAdmin} className="space-y-4">
            <label className="block text-sm">
              Nome do workspace
              <input name="workspaceName" defaultValue={settings.workspaceName} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm">
              Fuso horário
              <input name="timezone" defaultValue={settings.timezone} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="testMode" defaultChecked={settings.testMode} />
              Modo teste (não publica mensagens reais)
            </label>
            {isAdmin && (
              <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">
                Salvar
              </button>
            )}
          </fieldset>
        </form>
      )}

      {tab === "Marca" && (
        <form action={savePlimBrand} encType="multipart/form-data" className="max-w-lg space-y-4 rounded-2xl border border-violet-100 bg-white p-5">
          <fieldset disabled={!isAdmin} className="space-y-4">
            <label className="block text-sm">
              Nome da marca
              <input name="brandName" defaultValue={settings.brandName} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm">
              Cor principal
              <input name="brandColor" type="color" defaultValue={settings.brandColor} className="mt-1 h-10 w-full" />
            </label>
            <label className="block text-sm">
              Logo
              <input name="logo" type="file" accept="image/*" className="mt-1 w-full text-sm" />
            </label>
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 w-auto rounded border" />}
            <label className="block text-sm">
              Margem (px)
              <input name="logoMargin" type="number" defaultValue={settings.logoMargin} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm">
              Tamanho (px)
              <input name="logoSize" type="number" defaultValue={settings.logoSize} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block text-sm">
              Opacidade
              <input name="logoOpacity" type="number" step="0.01" min={0} max={1} defaultValue={settings.logoOpacity} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            {isAdmin && (
              <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white">
                Salvar marca
              </button>
            )}
          </fieldset>
        </form>
      )}

      {tab === "Usuários" && (
        <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-violet-50 text-left text-xs text-violet-800 uppercase">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2">Perfil PLIM</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-violet-50">
                  <td className="px-4 py-2">{m.name}</td>
                  <td className="px-4 py-2 text-slate-500">{m.email}</td>
                  <td className="px-4 py-2">
                    {isAdmin ? (
                      <form action={async (fd) => savePlimUserProfile(m.id, String(fd.get("profile")))}>
                        <select name="profile" defaultValue={m.plimProfile ?? "OPERADOR"} className="rounded border px-2 py-1">
                          {(["ADMIN", "OPERADOR", "VISUALIZADOR"] as PlimProfile[]).map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <button type="submit" className="ml-2 text-violet-600 hover:underline">Salvar</button>
                      </form>
                    ) : (
                      m.plimProfile ?? "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab !== "Geral" && tab !== "Marca" && tab !== "Usuários" && (
        <EmBreve title={`Configurações — ${tab}`} />
      )}
    </div>
  );
}
