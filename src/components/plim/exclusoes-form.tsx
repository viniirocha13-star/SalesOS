"use client";

import { useState, useTransition } from "react";
import { addExclusion, removeExclusion } from "@/app/(app)/plim/analytics-actions";

export function ExclusoesForm({
  canWrite,
  exclusions,
}: {
  canWrite: boolean;
  exclusions: { id: string; phone: string; reason: string | null; createdAt: Date }[];
}) {
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {canWrite ? (
        <form
          className="flex flex-wrap gap-2 rounded-xl border border-violet-100 bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              try {
                await addExclusion(phone, reason || undefined);
                setPhone("");
                setReason("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Erro");
              }
            });
          }}
        >
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone"
            className="rounded border px-2 py-1 text-sm"
            required
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="rounded border px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Adicionar opt-out
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <p className="text-sm text-slate-500">Somente Operador ou Administrador pode gerenciar exclusões.</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Motivo</th>
              <th className="px-3 py-2">Desde</th>
              {canWrite && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {exclusions.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">{e.phone}</td>
                <td className="px-3 py-2">{e.reason ?? "—"}</td>
                <td className="px-3 py-2">{new Date(e.createdAt).toLocaleDateString("pt-BR")}</td>
                {canWrite && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-violet-700 underline"
                      onClick={() => start(() => removeExclusion(e.phone))}
                    >
                      Remover opt-out
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
