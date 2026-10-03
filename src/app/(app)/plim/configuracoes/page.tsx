import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { PlimProfile, Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { getWorkspaceSettings, listWorkspaceMembers } from "@/lib/repositories/plim/settings";
import { canPlimAdmin } from "@/lib/plim/profile";
import { savePlimBrand, savePlimGeneral, savePlimUserProfile } from "@/app/(app)/plim/actions";
import { getStorageProvider } from "@/lib/storage";
import { AFFILIATE_ENV_KEYS, resolveAffiliateEnv } from "@/lib/plim/workspace-env";
import { listBlockedWords, ensureBlockedWordSeeds } from "@/lib/repositories/plim/blocked-words";
import { listTemplates, ensureDefaultTemplate } from "@/lib/repositories/plim/templates";
import {
  removePlimBlockedWord,
  savePlimAffiliateSettings,
  savePlimAiSettings,
  savePlimBlockedWord,
  savePlimInstagramSettings,
  savePlimTelegramSettings,
  savePlimTemplateFromSettings,
  savePlimTrackingSettings,
  testPlimAffiliateSettings,
  testPlimAiSettings,
  testPlimInstagramSettings,
  testPlimMetaAdsSettings,
  testPlimTelegramSettings,
  testPlimWhatsAppSettings,
} from "@/app/(app)/plim/settings-actions";
import { SettingsTestButton } from "@/components/plim/settings-test-button";
import { EmBreve } from "@/components/plim/em-breve";
import { plimCardClass } from "@/components/plim/plim-section";

const TABS = ["Geral", "Marca", "Afiliados", "WhatsApp", "Telegram", "Instagram", "IA", "Tracking", "Usuários"] as const;

const AFFILIATE_LABELS: Record<string, string> = {
  PLIM_AMAZON_TAG: "Amazon (tag)",
  PLIM_SHOPEE_AFFILIATE_ID: "Shopee",
  PLIM_MERCADOLIVRE_TRACKING_ID: "Mercado Livre",
  PLIM_MAGALU_PARTNER_ID: "Magalu",
  PLIM_ALIEXPRESS_TRACKING_ID: "AliExpress",
  PLIM_SHEIN_AFFILIATE_ID: "SHEIN",
  PLIM_AWIN_PUBLISHER_ID: "Awin",
};

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
  await ensureBlockedWordSeeds(ctx.tenantId);
  const blocked = await listBlockedWords(ctx.tenantId);
  await ensureDefaultTemplate(ctx.tenantId);
  const templates = await listTemplates(ctx.tenantId);
  const affiliateOverrides =
    settings.affiliateConfig && typeof settings.affiliateConfig === "object" && !Array.isArray(settings.affiliateConfig)
      ? (settings.affiliateConfig as Record<string, string>)
      : {};
  const sp = await searchParams;
  const tab = TABS.includes((sp.tab as typeof TABS[number]) ?? "Geral") ? (sp.tab as string) : "Geral";
  const isAdmin = canPlimAdmin(ctx.profile);
  const logoUrl = settings.logoPath ? getStorageProvider().getPublicUrl(settings.logoPath) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Configurações</h1>
        <p className="text-sm text-slate-500">Preferências do workspace PLIM persistidas no banco (credenciais só no servidor).</p>
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
            <label className="block text-sm">
              Janela de duplicidade (horas)
              <input
                name="duplicateWindowHours"
                type="number"
                min={1}
                max={168}
                defaultValue={settings.duplicateWindowHours}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
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

      {tab === "Afiliados" && (
        <div className="max-w-2xl space-y-4">
          <form action={savePlimAffiliateSettings} className={`${plimCardClass()} space-y-3`}>
            <h2 className="font-medium">IDs de afiliado (workspace)</h2>
            <p className="text-xs text-slate-500">Valores salvos aqui têm prioridade sobre o `.env`. Vazio = usa ambiente ou &quot;não configurado&quot;.</p>
            <fieldset disabled={!isAdmin} className="space-y-2">
              {AFFILIATE_ENV_KEYS.map((key) => (
                <label key={key} className="block text-sm">
                  {AFFILIATE_LABELS[key] ?? key}
                  <input
                    name={key}
                    defaultValue={affiliateOverrides[key] ?? ""}
                    placeholder={resolveAffiliateEnv(key) ? "(também no .env)" : "Não configurado"}
                    className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                  />
                </label>
              ))}
              {isAdmin && (
                <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar afiliados</button>
              )}
            </fieldset>
          </form>
          <div className={plimCardClass()}>
            <SettingsTestButton onTest={() => testPlimAffiliateSettings("PLIM_AMAZON_TAG")} />
          </div>
        </div>
      )}

      {tab === "WhatsApp" && (
        <div className={`${plimCardClass()} max-w-lg space-y-3`}>
          <p className="text-sm text-slate-600">
            Usa a integração Meta Cloud API do Sales OS (`META_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`). Nada é salvo no navegador.
          </p>
          <SettingsTestButton onTest={testPlimWhatsAppSettings} />
        </div>
      )}

      {tab === "Telegram" && (
        <form action={savePlimTelegramSettings} className={`${plimCardClass()} max-w-lg space-y-3`}>
          <label className="block text-sm">
            Bot token (servidor)
            <input
              name="telegramBotToken"
              type="password"
              autoComplete="off"
              placeholder={settings.telegramBotToken ? "•••••••• (salvo)" : "Ou TELEGRAM_BOT_TOKEN no .env"}
              className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
            />
          </label>
          {isAdmin && <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar</button>}
          <SettingsTestButton onTest={testPlimTelegramSettings} />
        </form>
      )}

      {tab === "Instagram" && (
        <div className="space-y-4 max-w-lg">
          <form action={savePlimInstagramSettings} className={`${plimCardClass()} space-y-3`}>
            <label className="block text-sm">
              Token Meta Ads / Graph (servidor)
              <input
                name="metaAdsToken"
                type="password"
                autoComplete="off"
                placeholder={settings.metaAdsToken ? "•••••••• (salvo)" : "Ou META_ADS_TOKEN no .env"}
                className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
              />
            </label>
            {isAdmin && <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar</button>}
            <SettingsTestButton onTest={testPlimMetaAdsSettings} />
            <SettingsTestButton label="TESTAR canal Instagram" onTest={testPlimInstagramSettings} />
          </form>
          <EmBreve
            title="Stories, Reels e Direct"
            description="A API oficial do Instagram não cobre publicação automática nesses formatos nesta versão."
          />
        </div>
      )}

      {tab === "IA" && (
        <form action={savePlimAiSettings} className={`${plimCardClass()} max-w-lg space-y-3`}>
          <p className="text-sm text-slate-600">Chave em `OPENAI_API_KEY` (ambiente). Modelo opcional por workspace.</p>
          <label className="block text-sm">
            Modelo OpenAI
            <input name="openAiModel" defaultValue={settings.openAiModel ?? ""} placeholder="ex: gpt-5.6-luna" className="mt-1 w-full rounded-lg border px-3 py-2" />
          </label>
          {isAdmin && <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar</button>}
          <SettingsTestButton onTest={testPlimAiSettings} />
        </form>
      )}

      {tab === "Tracking" && (
        <div className="max-w-2xl space-y-4">
          <form action={savePlimTrackingSettings} className={`${plimCardClass()} space-y-3`}>
            <label className="block text-sm">
              URL base para links `/o/[code]`
              <input
                name="trackingBaseUrl"
                defaultValue={settings.trackingBaseUrl ?? ""}
                placeholder="https://seu-dominio.com"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Janela de duplicidade (horas)
              <input name="duplicateWindowHours" type="number" min={1} max={168} defaultValue={settings.duplicateWindowHours} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            {isAdmin && <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar tracking</button>}
          </form>
          <form action={savePlimBlockedWord} className={`${plimCardClass()} flex flex-wrap items-end gap-2`}>
            <label className="flex-1 text-sm">
              Palavra bloqueada
              <input name="word" required className="mt-1 w-full rounded border px-2 py-1.5" />
            </label>
            {isAdmin && <button type="submit" className="rounded-lg border px-3 py-2 text-sm">Adicionar</button>}
          </form>
          <ul className={`${plimCardClass()} text-sm`}>
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between border-b border-violet-50 py-2 last:border-0">
                <span className={b.active ? "" : "text-slate-400 line-through"}>{b.word}</span>
                {isAdmin && (
                  <form action={removePlimBlockedWord}>
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" className="text-xs text-red-600">Remover</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <div className={plimCardClass()}>
            <h2 className="font-medium">Templates de mensagem</h2>
            {templates.map((t) => (
              <form key={t.id} action={savePlimTemplateFromSettings} className="mt-3 space-y-2 border-t border-violet-50 pt-3">
                <input type="hidden" name="id" value={t.id} />
                <input name="name" defaultValue={t.name} className="w-full rounded border px-2 py-1 text-sm" />
                <textarea name="body" defaultValue={t.body} rows={4} className="w-full rounded border p-2 font-mono text-xs" />
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name="isDefault" defaultChecked={t.isDefault} /> Padrão
                </label>
                {isAdmin && <button type="submit" className="text-sm text-violet-600">Salvar template</button>}
              </form>
            ))}
          </div>
        </div>
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
    </div>
  );
}
