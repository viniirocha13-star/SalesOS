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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {kicker && <p className="mb-1 text-[11px] font-medium tracking-[0.22em] text-terracotta uppercase">{kicker}</p>}
        <h1 className="font-heading text-3xl leading-tight text-ink md:text-[2.15rem]" data-testid={titleTestId}>
          {title}
        </h1>
        {description && <p className="mt-2 text-[15px] leading-relaxed text-ink/55">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
