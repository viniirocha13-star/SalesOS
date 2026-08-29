import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";

export default async function PosVendaPage() {
  const [executions, followUps, notices] = await Promise.all([
    prisma.workflowExecution.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    prisma.followUp.findMany({
      orderBy: { dueAt: "desc" },
      take: 40,
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const workflowIds = [...new Set(executions.map((e) => e.workflowId))];
  const workflows = await prisma.workflow.findMany({
    where: { id: { in: workflowIds } },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  const leadIds = executions.map((e) => e.leadId).filter(Boolean) as string[];
  const leads = leadIds.length
    ? await prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Operação"
        title="Pós-venda"
        description="Workflow após aprovação do pedido, follow-ups e avisos. Sem template aprovado, nada é inventado."
      />

      <section className="surface overflow-x-auto">
        <h2 className="font-heading px-4 pt-4 text-lg">Workflows</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Fluxo</th>
              <th className="p-3">Passo</th>
              <th className="p-3">Status</th>
              <th className="p-3">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {executions.map((ex) => {
              const wf = workflows.find((w) => w.id === ex.workflowId);
              const step = wf?.steps.find((s) => s.order === ex.currentOrder);
              const lead = leads.find((l) => l.id === ex.leadId);
              return (
                <tr key={ex.id} className="border-t">
                  <td className="p-3">
                    {ex.leadId ? (
                      <Link className="text-teal underline" href={`/leads/${ex.leadId}`}>
                        {lead?.name ?? "Lead"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3">{wf?.name ?? "—"}</td>
                  <td className="p-3">{step ? `${step.name} (${step.type})` : "—"}</td>
                  <td className="p-3">{ex.status}</td>
                  <td className="p-3">{formatDateTime(ex.updatedAt)}</td>
                </tr>
              );
            })}
            {!executions.length && (
              <tr>
                <td className="p-6 text-ink/50" colSpan={5}>
                  Nenhum fluxo de pós-venda. Ele começa quando a operação aprova um pedido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="surface overflow-x-auto">
        <h2 className="font-heading px-4 pt-4 text-lg">Follow-ups</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Estágio</th>
              <th className="p-3">Vence</th>
              <th className="p-3">Tentativas</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {followUps.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{f.stage}</td>
                <td className="p-3">{formatDateTime(f.dueAt)}</td>
                <td className="p-3">
                  {f.attempts}/{f.maxAttempts}
                </td>
                <td className="p-3">{f.cancelled ? "cancelado" : f.sentAt ? "enviado" : "agendado"}</td>
              </tr>
            ))}
            {!followUps.length && (
              <tr>
                <td className="p-6 text-ink/50" colSpan={4}>
                  Nenhum follow-up agendado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="surface overflow-x-auto">
        <h2 className="font-heading px-4 pt-4 text-lg">Avisos operacionais</h2>
        <div className="space-y-2 p-4 text-sm">
          {notices.map((n) => (
            <p key={n.id} className="rounded-lg bg-amber-50 p-3">
              <span className="font-medium">{n.title}</span> — {n.body}
            </p>
          ))}
          {!notices.length && <p className="text-ink/50">Nenhum aviso. Integrações ausentes não geram falha de pós-venda silenciosa.</p>}
        </div>
      </section>
    </div>
  );
}
