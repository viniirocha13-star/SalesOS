import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { diagnoseMeta } from "@/wa/meta-connection";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/workers/queue";
import { isWorkerHeartbeatFresh } from "@/workers/heartbeat";
import { WORKER_HEARTBEAT_KEY } from "@/lib/app-url";
import { cn } from "@/lib/utils";

export default async function DiagnosticsPage() {
  const ctx = await requireOrg("diagnostics.view");
  const meta = await diagnoseMeta(ctx.organization.id);

  let redisOk = false;
  let workerOk = false;
  try {
    const pong = await getRedis().ping();
    redisOk = pong === "PONG";
    const hb = await getRedis().get(WORKER_HEARTBEAT_KEY);
    workerOk = isWorkerHeartbeatFresh(hb);
  } catch {
    redisOk = false;
  }

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const extra = [
    { id: "database", ok: dbOk, detail: dbOk ? "PostgreSQL acessível" : "Banco inacessível" },
    { id: "redis", ok: redisOk, detail: redisOk ? "Redis ativo" : "Redis inacessível" },
    { id: "worker", ok: workerOk, detail: workerOk ? "Worker com heartbeat fresco" : "Worker offline ou sem heartbeat" },
  ];
  const checks = [...meta.checks, ...extra];
  const passed = checks.filter((c) => c.ok).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        kicker="ZapTurbo"
        title="Diagnóstico"
        description={`${checks.length} verificações · ${passed} OK · ${checks.length - passed} requer atenção`}
      />
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 px-5 py-3.5 text-sm">
            <div>
              <p className="font-medium">{c.id.replaceAll("_", " ")}</p>
              <p className="text-slate-500">{c.detail}</p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                c.ok ? "bg-[#e8f8f0] text-[#148a52]" : "bg-amber-50 text-amber-800",
              )}
            >
              {c.ok ? "OK" : "Atenção"}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/conectar" className="text-sm font-medium text-[#148a52] hover:underline">
        Ir para conexão Meta
      </Link>
    </div>
  );
}
