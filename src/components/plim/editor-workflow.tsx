"use client";

import { useState } from "react";
import { editorWorkflow, ensureShortLink } from "@/app/(app)/plim/operacao-actions";

export function EditorWorkflow({
  offerId,
  groups,
}: {
  offerId: string;
  groups: { id: string; name: string }[];
}) {
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <select
        multiple
        className="min-w-[200px] rounded border px-2 py-1 text-sm"
        onChange={(e) => setGroupIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>
      <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="rounded border px-2 py-1 text-sm" />
      <button type="button" className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white" onClick={async () => { await editorWorkflow(offerId, "approve"); setMsg("Aprovada"); }}>APROVAR</button>
      <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setMsg("Use o formulário acima para editar.")}>EDITAR</button>
      <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={async () => {
        if (!scheduledAt || !groupIds.length) { setMsg("Selecione destinos e data."); return; }
        await editorWorkflow(offerId, "schedule", { groupIds, scheduledAt });
        setMsg("Programada");
      }}>PROGRAMAR</button>
      <button type="button" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white" onClick={async () => {
        if (!groupIds.length) { setMsg("Selecione destinos."); return; }
        await editorWorkflow(offerId, "send", { groupIds });
        setMsg("Enfileirado / enviado (modo teste se ativo)");
      }}>ENVIAR AGORA</button>
      <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={async () => {
        const link = await ensureShortLink(offerId, groupIds[0]);
        setShortUrl(link.publicUrl);
      }}>Gerar link curto</button>
      {msg && <p className="w-full text-xs text-slate-500">{msg}</p>}
      {shortUrl && <p className="w-full text-xs font-mono">{shortUrl}</p>}
    </div>
  );
}
