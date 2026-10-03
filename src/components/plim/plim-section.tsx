export function PlimSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">{title}</h1>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function plimCardClass() {
  return "rounded-2xl border border-violet-100 bg-white p-5 shadow-sm";
}
