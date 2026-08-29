import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  description,
  action,
  titleTestId,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  titleTestId?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {kicker && <p className="mb-1 text-[11px] font-semibold tracking-[0.16em] text-teal uppercase">{kicker}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.75rem]" data-testid={titleTestId}>
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
