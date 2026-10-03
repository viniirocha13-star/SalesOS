"use client";

import { useTransition } from "react";
import { retryPlimError } from "@/app/(app)/plim/analytics-actions";
import { hasPlimErrorHandler } from "@/lib/plim/error-retry";

type Row = {
  id: string;
  createdAt: Date;
  module: string;
  action: string;
  error: string;
  payload: unknown;
  attempts: number;
  handlerKey: string | null;
};

export function HistoricoErrorsTable({ rows, canRetry }: { rows: Row[]; canRetry: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="overflow-x-auto rounded-xl border border-red-100 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-red-50 text-xs uppercase text-red-800">
          <tr>
            <th className="px-3 py-2">Data</th>
            <th className="px-3 py-2">Módulo</th>
            <th className="px-3 py-2">Ação</th>
            <th className="px-3 py-2">Erro</th>
            <th className="px-3 py-2">Tentativas</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const handlerOk = hasPlimErrorHandler(r.handlerKey);
            const disabled = !canRetry || !handlerOk;
            const reason = !r.handlerKey
              ? "Sem handler"
              : !handlerOk
                ? "Retry não implementado"
                : undefined;
            return (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {new Date(r.createdAt).toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2">{r.module}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="max-w-xs truncate px-3 py-2 text-red-700" title={r.error}>{r.error}</td>
                <td className="px-3 py-2">{r.attempts}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={disabled || pending}
                    title={disabled ? reason : undefined}
                    className="rounded border border-violet-200 px-2 py-1 text-xs disabled:opacity-40"
                    onClick={() =>
                      start(async () => {
                        await retryPlimError(r.id);
                      })
                    }
                  >
                    TENTAR NOVAMENTE
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <p className="p-4 text-sm text-slate-500">Nenhum erro pendente.</p>}
    </div>
  );
}
