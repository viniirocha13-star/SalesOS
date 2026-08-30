import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatBRL, formatDateTime } from "@/lib/format";
import { OfferBadge } from "@/components/status-badge";
import { BookActivateButton } from "@/components/book-activate-button";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import Link from "next/link";

export default async function BookReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const canApprove = session?.user ? can(session.user.role as Role, "offers.approve") : false;
  const book = await prisma.offerBook.findUnique({
    where: { id },
    include: { offers: { orderBy: [{ sourceSheet: "asc" }, { sourceRow: "asc" }] } },
  });
  if (!book) notFound();
  const stats = (book.stats as Record<string, unknown> | null) ?? {};
  const cats = (stats.categories as Record<string, number> | undefined) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.14em] text-ink/40 uppercase">Book importado</p>
        <h1 className="font-heading text-3xl">{book.originalName}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Status {book.status} · {formatDateTime(book.createdAt)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Linhas processadas" value={book.lineCount} />
        <Stat label="Ofertas detectadas" value={book.offerCount} />
        <Stat label="Erros" value={book.errorCount} />
        <Stat label="Alertas" value={book.warningCount} />
      </div>

      <div className="surface p-5">
        <h2 className="font-medium">Categorias</h2>
        <p className="mt-2 text-sm text-slate-600">
          {Object.entries(cats).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Vigência no arquivo: {String((stats.validity as { from?: string; until?: string } | undefined)?.from ?? "—")} →{" "}
          {String((stats.validity as { from?: string; until?: string } | undefined)?.until ?? "—")}
        </p>
      </div>

      {canApprove && book.status !== "ACTIVE" && <BookActivateButton bookId={book.id} />}

      <div className="surface overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Aba / linha</th>
              <th className="p-3">Plano</th>
              <th className="p-3">Cat.</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Vigência</th>
              <th className="p-3">Validação</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {book.offers.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3 text-xs">
                  {o.sourceSheet} #{o.sourceRow}
                </td>
                <td className="p-3">
                  <Link href={`/ofertas/${o.id}`} className="font-medium hover:underline">
                    {o.name}
                  </Link>
                  <p className="text-xs text-slate-400">{o.acquisitionType} · {o.salesChannelRaw}</p>
                </td>
                <td className="p-3">{o.categoryNormalized ?? o.category}</td>
                <td className="p-3">{formatBRL(o.promotionalPriceCents ?? o.priceCents)}</td>
                <td className="p-3 text-xs">
                  {o.startsAt?.toLocaleDateString("pt-BR")} – {o.endsAt?.toLocaleDateString("pt-BR")}
                </td>
                <td className="p-3 text-xs">
                  {Array.isArray(o.validationErrors) && (o.validationErrors as string[]).length
                    ? (o.validationErrors as string[]).join(", ")
                    : Array.isArray(o.validationWarnings) && (o.validationWarnings as string[]).length
                      ? (o.validationWarnings as string[]).join(", ")
                      : "ok"}
                </td>
                <td className="p-3">
                  <OfferBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface p-4">
      <p className="text-[11px] tracking-[0.14em] text-ink/40 uppercase">{label}</p>
      <p className="mt-1 font-heading text-3xl">{value}</p>
    </div>
  );
}
