import Link from "next/link";
import { listMasterHubs } from "@/lib/repositories/plim/public-groups";

export default async function PublicGruposPage() {
  const hubs = await listMasterHubs();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-violet-950">Grupos PLIM PROMOS</h1>
      <p className="mt-2 text-sm text-slate-600">Entre no grupo de promoções pelo link oficial abaixo.</p>
      {hubs.length === 0 ? (
        <p className="mt-8 rounded-xl border border-violet-100 bg-violet-50/50 p-6 text-sm text-slate-600">
          Nenhum grupo público disponível no momento.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {hubs.map((h) => (
            <li key={h.id}>
              <Link
                href={`/grupos/${h.publicSlug}`}
                className="block rounded-xl border border-violet-100 bg-white p-4 shadow-sm transition hover:border-violet-300"
              >
                <span className="font-medium text-violet-900">{h.name}</span>
                {h.niche && <span className="ml-2 text-xs text-slate-500">{h.niche}</span>}
                <p className="mt-1 text-xs text-slate-500">{h.platform}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
