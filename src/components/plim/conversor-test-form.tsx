"use client";

import { useState } from "react";
import { testAffiliateConversion } from "@/app/(app)/plim/operacao-actions";

export function ConversorTestForm({ groups }: { groups: { id: string; name: string; externalId: string | null }[] }) {
  const [url, setUrl] = useState("");
  const [groupId, setGroupId] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="URL do produto"
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />
      <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
        <option value="">Sem sub-id de grupo</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name} {g.externalId ? `(${g.externalId})` : ""}</option>
        ))}
      </select>
      <button
        type="button"
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
        onClick={async () => {
          const r = await testAffiliateConversion(url, groupId || undefined);
          setResult(r.ok ? r.affiliateUrl : r.error ?? "Erro");
        }}
      >
        TESTAR CONVERSÃO
      </button>
      {result && <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">{result}</pre>}
    </div>
  );
}
