import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { InboxComposer } from "@/components/inbox-composer";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

function windowLabel(expiresAt: Date | null | undefined) {
  if (!expiresAt) return { open: false, text: "Janela encerrada — utilize um template aprovado" };
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return { open: false, text: "Janela encerrada — utilize um template aprovado" };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return { open: true, text: `Janela de atendimento aberta · expira em ${h}h${String(m).padStart(2, "0")}min` };
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const ctx = await requireOrg("inbox.view");
  const { id } = await searchParams;
  const [conversations, templates] = await Promise.all([
    prisma.waConversation.findMany({
      where: { organizationId: ctx.organization.id },
      include: { contact: true, phoneNumber: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.messageTemplate.findMany({
      where: { organizationId: ctx.organization.id, status: "APPROVED" },
      select: { name: true, language: true },
      take: 50,
    }),
  ]);
  const active = conversations.find((c) => c.id === id) ?? conversations[0];
  const messages = active
    ? await prisma.waMessage.findMany({
        where: { conversationId: active.id, organizationId: ctx.organization.id },
        orderBy: { createdAt: "asc" },
        take: 100,
      })
    : [];
  const window = windowLabel(active?.serviceWindowExpiresAt);

  if (active && active.unreadCount > 0) {
    await prisma.waConversation.update({
      where: { id: active.id },
      data: { unreadCount: 0 },
    });
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] max-w-6xl flex-col">
      <PageHeader
        kicker="ZapTurbo"
        title="Conversas"
        description="Caixa de entrada WhatsApp com janela de atendimento e opt-out automático."
      />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
        <aside className="overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-slate-400">Nenhuma conversa ainda.</p>
          )}
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/conversations?id=${c.id}`}
              className={`block border-b border-slate-100 px-4 py-3 hover:bg-slate-50 ${
                active?.id === c.id ? "bg-[#e8f8f0]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{c.contact.name ?? c.contact.phoneE164}</p>
                {c.unreadCount > 0 && (
                  <span className="rounded-full bg-[#1fad6c] px-1.5 text-[10px] font-semibold text-white">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <p className="truncate text-[12px] text-slate-400">{c.lastMessagePreview ?? "—"}</p>
            </Link>
          ))}
        </aside>

        <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          {active ? (
            <>
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="font-semibold">{active.contact.name ?? active.contact.phoneE164}</p>
                <p className={`text-[12px] ${window.open ? "text-[#148a52]" : "text-amber-700"}`}>
                  {window.text}
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.direction === "INBOUND"
                        ? "bg-slate-100 text-slate-800"
                        : "ml-auto bg-[#dcf8c6] text-slate-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body ?? m.templateName ?? m.type}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {m.status} · {m.createdAt.toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
              <InboxComposer
                conversationId={active.id}
                windowOpen={window.open}
                templates={templates}
              />
            </>
          ) : (
            <p className="m-auto text-sm text-slate-400">Selecione uma conversa</p>
          )}
        </section>

        <aside className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {active ? (
            <div className="space-y-3 text-sm">
              <h2 className="font-semibold">Contato</h2>
              <p>{active.contact.name ?? "—"}</p>
              <p className="tabular-nums text-slate-500">{active.contact.phoneE164}</p>
              <p className="text-slate-500">Status: {active.contact.status}</p>
              <p className="text-slate-500">Número: {active.phoneNumber.displayPhoneNumber}</p>
              {active.contact.optedOutAt && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-red-700">Opt-out registrado</p>
              )}
              <Link href="/contacts" className="inline-block text-[#148a52] hover:underline">
                Ver contatos
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Dados do contato</p>
          )}
        </aside>
      </div>
    </div>
  );
}
