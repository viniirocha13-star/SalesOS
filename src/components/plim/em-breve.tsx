import { Sparkles } from "lucide-react";

export function EmBreve({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-violet-200/60 bg-gradient-to-b from-violet-50/80 to-white px-6 py-16 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
        <Sparkles className="size-7" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {description ?? "Este módulo será liberado nas próximas etapas do PLIM AUTOMAÇÃO."}
      </p>
      <p className="mt-6 text-xs font-semibold tracking-widest text-violet-600 uppercase">Em breve</p>
    </div>
  );
}
