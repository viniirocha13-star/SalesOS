"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingProgress } from "@/wa/onboarding-progress";

export function OnboardingChecklist({ progress }: { progress: OnboardingProgress }) {
  return (
    <div className="space-y-6">
      <div className="surface overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#e6f7f3] to-white px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-teal uppercase">
                Passo a passo do cliente
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {progress.percent === 100
                  ? "Onboarding concluído"
                  : `Progresso: ${progress.completed} de ${progress.total} passos`}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Siga a ordem abaixo. A plataforma cuida de tokens, IDs e filas — você não precisa abrir
                Postman, Baserow, n8n ou SSH.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold tabular-nums text-teal">{progress.percent}%</div>
              <div className="text-xs text-slate-400">concluído</div>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
            <div
              className="h-full rounded-full bg-teal transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        <ol className="divide-y divide-slate-100">
          {progress.steps.map((step) => {
            const isNext = progress.next?.id === step.id;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
                  isNext && "bg-[#f0faf7]",
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
                  ) : (
                    <Circle
                      className={cn("mt-0.5 size-5 shrink-0", isNext ? "text-teal" : "text-slate-300")}
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold tracking-wide text-slate-400">
                        PASSO {step.order}
                      </span>
                      {isNext && (
                        <span className="rounded-md bg-teal/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal">
                          PRÓXIMO
                        </span>
                      )}
                      {step.done && (
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          FEITO
                        </span>
                      )}
                    </div>
                    <h3 className="mt-0.5 text-[15px] font-medium text-slate-900">{step.title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
                <Link
                  href={step.href}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium",
                    isNext
                      ? "bg-teal text-white hover:bg-[#0d8a77]"
                      : step.done
                        ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        : "border border-slate-200 text-slate-500 hover:bg-slate-50",
                  )}
                >
                  {step.done ? "Revisar" : step.cta}
                  <ArrowRight className="size-3.5" />
                </Link>
              </li>
            );
          })}
        </ol>
      </div>

      {progress.next && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal/20 bg-[#e6f7f3] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Continue pelo próximo passo</p>
            <p className="text-sm text-slate-600">{progress.next.title}</p>
          </div>
          <Link
            href={progress.next.href}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal px-4 text-sm font-medium text-white hover:bg-[#0d8a77]"
          >
            {progress.next.cta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
