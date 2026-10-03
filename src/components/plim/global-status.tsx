"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type HealthPayload = {
  plim?: {
    globalStatus: string;
    subsystems: Record<string, string>;
  };
  testMode?: boolean;
};

const LABELS: Record<string, string> = {
  database: "Banco",
  queue: "Fila",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  instagram: "Instagram",
  affiliates: "Afiliados",
  tracking: "Tracking",
};

export function PlimGlobalStatus({ testMode }: { testMode: boolean }) {
  const [data, setData] = useState<HealthPayload | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const global = data?.plim?.globalStatus ?? "OPERACIONAL";
  const ok = global === "OPERACIONAL";

  return (
    <div className="flex items-center gap-2">
      {testMode && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 uppercase">
          Modo teste
        </span>
      )}
      <Popover>
        <PopoverTrigger
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
            ok ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "bg-amber-50 text-amber-900 hover:bg-amber-100",
          )}
        >
          <span className={cn("size-2 rounded-full", ok ? "bg-emerald-500" : "bg-amber-500")} />
          {ok ? "Sistema operacional" : "Atenção"}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 text-sm">
          <p className="mb-2 font-semibold text-slate-800">Status dos subsistemas</p>
          <ul className="space-y-1.5">
            {Object.entries(data?.plim?.subsystems ?? {}).map(([key, status]) => (
              <li key={key} className="flex justify-between text-xs">
                <span className="text-slate-600">{LABELS[key] ?? key}</span>
                <span className="font-medium text-slate-900">{status}</span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
