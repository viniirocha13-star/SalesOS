import { ExternalLink } from "lucide-react";
import type { HelpLink } from "@/wa/help-links";
import { cn } from "@/lib/utils";

/**
 * Bloco de "Onde obter isso" para etapas que dependem de ação fora do painel.
 * Sempre abre em nova aba e nunca expõe segredos.
 */
export function ExternalHelp({
  title = "Onde obter isso",
  intro,
  links,
  compact = false,
  className,
}: {
  title?: string;
  intro?: string;
  links: HelpLink[];
  compact?: boolean;
  className?: string;
}) {
  if (!links.length) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-sky-100 bg-sky-50/60 text-sky-950",
        compact ? "px-3 py-2.5" : "p-4",
        className,
      )}
    >
      <p className={cn("font-semibold", compact ? "text-[12px]" : "text-[13px]")}>{title}</p>
      {intro && <p className="mt-0.5 text-[12px] text-sky-900/80">{intro}</p>}
      <ul className={cn("space-y-1", compact ? "mt-1.5" : "mt-2")}>
        {links.map((l) => (
          <li key={l.href} className="text-[12.5px] leading-snug">
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-sky-800 underline-offset-2 hover:underline"
            >
              {l.label}
              <ExternalLink className="size-3" aria-hidden />
            </a>
            {l.hint && <span className="text-sky-900/70"> — {l.hint}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
