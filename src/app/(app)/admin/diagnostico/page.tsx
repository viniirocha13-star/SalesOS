import { collectOpsDiagnostics } from "@/lib/ops-status";
import { PageHeader } from "@/components/page-header";
import { appOrigin, healthUrl, loginUrl } from "@/lib/app-url";
import { formatDateTime } from "@/lib/format";

export default async function DiagnosticoPage() {
  const d = await collectOpsDiagnostics();
  const rows: [string, string][] = [
    ["WEB", `ONLINE · uptime ${d.webUptimeSeconds}s`],
    ["WORKER", d.worker],
    ["REDIS", d.redis === "up" ? "ONLINE" : d.redis === "not_configured" ? "NOT_CONFIGURED" : "OFFLINE"],
    ["BANCO", d.database === "up" ? "ONLINE" : "OFFLINE"],
    ["OPENAI", d.openai],
    ["WHATSAPP", d.whatsapp],
    ["Última inbound", d.lastInboundAt ? formatDateTime(d.lastInboundAt) : "—"],
    ["Último job", d.lastJobAt ? `${formatDateTime(d.lastJobAt)} · ${d.lastJobLabel ?? "—"}` : "—"],
    ["Última falha de envio", d.lastFailAt ? formatDateTime(d.lastFailAt) : "—"],
    [
      "Uptime do worker",
      d.workerStartedAt ? `desde ${formatDateTime(d.workerStartedAt)} (pid ${d.workerPid ?? "—"})` : "—",
    ],
    ["Heartbeat", d.workerHeartbeatAt ? formatDateTime(d.workerHeartbeatAt) : "ausente"],
    ["Versão", d.version],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Operações"
        title="Diagnóstico"
        description="Se esta página e /api/health respondem, o app está no ar. Preview do Cursor fora do ar não significa aplicação travada."
      />
      <div className="surface space-y-2 p-5 text-sm">
        <p>
          URL real:{" "}
          <a className="text-teal underline" href={loginUrl()}>
            {loginUrl()}
          </a>
        </p>
        <p>
          Health:{" "}
          <a className="text-teal underline" href={healthUrl()}>
            {healthUrl()}
          </a>
        </p>
        <p className="text-slate-500">{d.previewHint}</p>
        <p className="text-xs text-slate-400">Origem configurada: {appOrigin()}</p>
      </div>
      <div className="surface overflow-hidden">
        <table className="data-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td className="w-56 font-medium text-slate-500">{k}</td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
