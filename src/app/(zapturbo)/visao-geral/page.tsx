import Link from "next/link";
import {
  Send,
  CheckCheck,
  Eye,
  MessageCircleReply,
  Smartphone,
  Megaphone,
  Upload,
  BarChart3,
  ArrowUpRight,
  CircleCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/org";
import { getOnboardingProgress } from "@/wa/onboarding-progress";
import { cn } from "@/lib/utils";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Concluída", className: "bg-emerald-50 text-emerald-700" },
  RUNNING: { label: "Em andamento", className: "bg-sky-50 text-sky-700" },
  QUEUING: { label: "Em andamento", className: "bg-sky-50 text-sky-700" },
  SCHEDULED: { label: "Agendada", className: "bg-amber-50 text-amber-800" },
  PAUSED: { label: "Pausada", className: "bg-slate-100 text-slate-600" },
  DRAFT: { label: "Rascunho", className: "bg-slate-100 text-slate-600" },
  CANCELLED: { label: "Cancelada", className: "bg-red-50 text-red-700" },
  FAILED: { label: "Falhou", className: "bg-red-50 text-red-700" },
};

export default async function VisaoGeralPage() {
  const ctx = await requireOrg("analytics.view");
  const orgId = ctx.organization.id;
  const today = startOfToday();
  const weekStart = daysAgo(6);

  const [
    sentToday,
    deliveredToday,
    readToday,
    repliedToday,
    campaigns,
    meta,
    phone,
    recentCampaigns,
    auditLogs,
    progress,
    seriesRaw,
  ] = await Promise.all([
    prisma.waMessage.count({
      where: { organizationId: orgId, direction: "OUTBOUND", sentAt: { gte: today }, status: { in: ["SENT", "DELIVERED", "READ"] } },
    }),
    prisma.waMessage.count({
      where: { organizationId: orgId, direction: "OUTBOUND", deliveredAt: { gte: today } },
    }),
    prisma.waMessage.count({
      where: { organizationId: orgId, direction: "OUTBOUND", readAt: { gte: today } },
    }),
    prisma.waMessage.count({
      where: { organizationId: orgId, direction: "INBOUND", createdAt: { gte: today } },
    }),
    prisma.waCampaign.count({ where: { organizationId: orgId } }),
    prisma.metaConnection.findUnique({ where: { organizationId: orgId } }),
    prisma.phoneNumber.findFirst({
      where: { organizationId: orgId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.waCampaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    getOnboardingProgress(orgId),
    prisma.waMessage.findMany({
      where: {
        organizationId: orgId,
        direction: "OUTBOUND",
        createdAt: { gte: weekStart },
      },
      select: { createdAt: true, status: true, sentAt: true, deliveredAt: true, readAt: true },
    }),
  ]);

  const dayKeys = Array.from({ length: 7 }, (_, i) => {
    const d = daysAgo(6 - i);
    return d.toISOString().slice(0, 10);
  });
  const series = dayKeys.map((key) => {
    const dayMsgs = seriesRaw.filter((m) => m.createdAt.toISOString().slice(0, 10) === key);
    return {
      day: key.slice(8),
      sent: dayMsgs.filter((m) => m.sentAt || ["SENT", "DELIVERED", "READ"].includes(m.status)).length,
      delivered: dayMsgs.filter((m) => m.deliveredAt || ["DELIVERED", "READ"].includes(m.status)).length,
      read: dayMsgs.filter((m) => m.readAt || m.status === "READ").length,
      replied: 0,
    };
  });
  const maxY = Math.max(1, ...series.flatMap((s) => [s.sent, s.delivered, s.read]));

  const deliverRate = sentToday > 0 ? ((deliveredToday / sentToday) * 100).toFixed(1) : "—";
  const readRate = deliveredToday > 0 ? ((readToday / deliveredToday) * 100).toFixed(1) : "—";
  const replyRate = deliveredToday > 0 ? ((repliedToday / deliveredToday) * 100).toFixed(1) : "—";

  const metaConnected = meta?.status === "CONNECTED";
  const tierLabel = phone?.messagingLimitTier ?? "—";
  const quality = phone?.qualityRating ?? "—";

  const kpis = [
    {
      label: "Mensagens enviadas",
      value: sentToday.toLocaleString("pt-BR"),
      hint: campaigns === 0 ? "Sem campanhas ainda" : "Hoje",
      icon: Send,
      tone: "bg-[#e8f8f0] text-[#148a52]",
    },
    {
      label: "Entregues",
      value: deliveredToday.toLocaleString("pt-BR"),
      hint: deliverRate === "—" ? "Aguardando envios" : `${deliverRate}% taxa`,
      icon: CheckCheck,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Lidas",
      value: readToday.toLocaleString("pt-BR"),
      hint: readRate === "—" ? "Aguardando leituras" : `${readRate}% taxa`,
      icon: Eye,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Respostas",
      value: repliedToday.toLocaleString("pt-BR"),
      hint: replyRate === "—" ? "Aguardando respostas" : `${replyRate}% taxa`,
      icon: MessageCircleReply,
      tone: "bg-amber-50 text-amber-800",
    },
  ];

  const quick = [
    { href: "/conectar", label: "Conectar WhatsApp (Meta)", icon: Smartphone },
    { href: "/campaigns/new", label: "Criar nova campanha", icon: Megaphone },
    { href: "/contacts/import", label: "Importar contatos", icon: Upload },
    { href: "/reports", label: "Ver relatórios", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {!progress.readyForCampaigns && progress.next && (
        <Link
          href="/onboarding"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1fad6c]/25 bg-[#e8f8f0] px-5 py-3.5"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Continue o passo a passo · {progress.completed}/{progress.total}
            </p>
            <p className="text-sm text-slate-600">Próximo: {progress.next.title}</p>
          </div>
          <span className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#1fad6c] px-3 text-sm font-semibold text-white">
            Abrir checklist
            <ArrowUpRight className="size-4" />
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] font-medium text-slate-500">{k.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{k.value}</p>
                  <p className="mt-1 text-[12px] text-slate-400">{k.hint}</p>
                </div>
                <span className={cn("flex size-10 items-center justify-center rounded-xl", k.tone)}>
                  <Icon className="size-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">Desempenho das campanhas</h2>
                <p className="text-[12px] text-slate-400">Últimos 7 dias</p>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-[#1fad6c]" /> Enviadas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-sky-500" /> Entregues
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <i className="size-2 rounded-full bg-violet-500" /> Lidas
                </span>
              </div>
            </div>
            <MiniLineChart series={series} maxY={maxY} />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-10 items-center justify-center rounded-xl",
                    metaConnected ? "bg-[#e8f8f0] text-[#148a52]" : "bg-amber-50 text-amber-700",
                  )}
                >
                  <Smartphone className="size-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[15px] font-semibold">Conta Meta</h2>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        metaConnected ? "bg-[#e8f8f0] text-[#148a52]" : "bg-amber-50 text-amber-800",
                      )}
                    >
                      {metaConnected ? (
                        <>
                          <CircleCheck className="size-3.5" /> Conectada
                        </>
                      ) : (
                        "Não conectada"
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {phone?.displayPhoneNumber ?? "Nenhum número selecionado"}
                    {meta?.businessName ? ` · ${meta.businessName}` : ""}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    Qualidade: {quality} · Limite informado: {tierLabel}
                    {meta?.businessId ? ` · Business ID ${meta.businessId}` : ""}
                  </p>
                </div>
              </div>
              <Link
                href="/conectar"
                className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Gerenciar conexão
              </Link>
            </div>
            {phone && (
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between text-[12px] text-slate-500">
                  <span>Categoria em uso nas campanhas · status do número</span>
                  <span className="font-medium text-slate-700">{phone.status}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#1fad6c]"
                    style={{ width: metaConnected ? "43%" : "8%" }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Limites e qualidade vêm da Meta e podem mudar. Não use valores fixos do curso.
                </p>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold">Campanhas recentes</h2>
              <Link href="/campaigns" className="text-sm font-medium text-[#148a52] hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50/80 text-[11px] tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Campanha</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Enviadas</th>
                    <th className="px-3 py-3 font-semibold">Entregues</th>
                    <th className="px-3 py-3 font-semibold">Lidas</th>
                    <th className="px-3 py-3 font-semibold">Respostas</th>
                    <th className="px-5 py-3 font-semibold">Criada</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                        Nenhuma campanha ainda.{" "}
                        <Link href="/campaigns/new" className="font-medium text-[#148a52] hover:underline">
                          Criar a primeira
                        </Link>
                      </td>
                    </tr>
                  )}
                  {recentCampaigns.map((c) => {
                    const st = STATUS_LABEL[c.status] ?? {
                      label: c.status,
                      className: "bg-slate-100 text-slate-600",
                    };
                    return (
                      <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <Link href={`/campaigns/${c.id}`} className="font-medium text-slate-900 hover:text-[#148a52]">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", st.className)}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 tabular-nums">{c.sentCount}</td>
                        <td className="px-3 py-3 tabular-nums">{c.deliveredCount}</td>
                        <td className="px-3 py-3 tabular-nums">{c.readCount}</td>
                        <td className="px-3 py-3 tabular-nums">{c.repliedCount}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {c.createdAt.toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold">Ações rápidas</h2>
            <ul className="mt-3 space-y-1.5">
              {quick.map((q) => {
                const Icon = q.icon;
                return (
                  <li key={q.href}>
                    <Link
                      href={q.href}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-[#e8f8f0] text-[#148a52]">
                        <Icon className="size-4" />
                      </span>
                      {q.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold">Últimas atividades</h2>
            <ul className="mt-3 space-y-3">
              {auditLogs.length === 0 && (
                <li className="text-sm text-slate-400">Sem atividades ainda. Conecte a Meta para começar.</li>
              )}
              {auditLogs.map((log) => (
                <li key={log.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1fad6c]" />
                  <div>
                    <p className="font-medium text-slate-800">{humanizeAudit(log.action)}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatRelative(log.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-[#0b1f17] p-5 text-white shadow-sm">
            <h2 className="text-[15px] font-semibold">Precisa de ajuda?</h2>
            <p className="mt-1.5 text-[13px] text-white/65">
              Siga o passo a passo do cliente — da conta à primeira campanha, sem ferramentas técnicas.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/onboarding"
                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#1fad6c] text-sm font-semibold text-white hover:bg-[#18965c]"
              >
                Ver tutoriais / checklist
              </Link>
              <Link
                href="/settings/diagnostics"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/15 text-sm font-medium text-white/90 hover:bg-white/5"
              >
                Diagnosticar conexão
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniLineChart({
  series,
  maxY,
}: {
  series: { day: string; sent: number; delivered: number; read: number }[];
  maxY: number;
}) {
  const w = 640;
  const h = 180;
  const pad = 24;
  const toX = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, series.length - 1);
  const toY = (v: number) => h - pad - (v / maxY) * (h - pad * 2);

  function path(key: "sent" | "delivered" | "read") {
    return series
      .map((s, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(s[key]).toFixed(1)}`)
      .join(" ");
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full min-w-[420px]">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={w - pad}
            y1={toY(maxY * t)}
            y2={toY(maxY * t)}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
        ))}
        <path d={path("sent")} fill="none" stroke="#1fad6c" strokeWidth="2.5" />
        <path d={path("delivered")} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
        <path d={path("read")} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
        {series.map((s, i) => (
          <text
            key={s.day}
            x={toX(i)}
            y={h - 6}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="11"
          >
            {s.day}
          </text>
        ))}
      </svg>
    </div>
  );
}

function humanizeAudit(action: string) {
  const map: Record<string, string> = {
    "organization.create": "Empresa criada",
    "organization.switch": "Empresa alternada",
    "organization.update": "Dados da empresa atualizados",
    "user.register": "Conta criada",
    "meta.connect": "WhatsApp / Meta conectada",
    "meta.sync": "Sincronização Meta",
    "campaign.create": "Campanha criada",
    "campaign.start": "Campanha iniciada",
    "campaign.completed": "Campanha concluída",
    "contacts.import": "Lista de contatos importada",
    "template.submit": "Template enviado para aprovação",
    "template.approved": "Template aprovado",
  };
  return map[action] ?? action.replaceAll(".", " · ");
}

function formatRelative(date: Date) {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return date.toLocaleDateString("pt-BR");
}
