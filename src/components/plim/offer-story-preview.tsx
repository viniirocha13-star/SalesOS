"use client";

import { useState } from "react";
import type { ImageTemplateId } from "@/lib/plim/image-templates";
import { renderPromoCanvas } from "@/lib/plim/render-promo-canvas";

type Brand = {
  logoPath: string | null;
  logoMargin: number;
  logoSize: number;
  logoOpacity: number;
  brandColor: string;
};

export function OfferStoryPreview({
  productName,
  imageUrl,
  promoText,
  brand,
}: {
  productName: string;
  imageUrl: string | null;
  promoText: string;
  brand: Brand;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="font-medium">Story 1080×1920</h2>
      <p className="text-xs text-slate-500">
        Gera arte vertical a partir do template PLIM e da imagem da oferta. Publicar no Instagram permanece em breve.
      </p>
      <button
        type="button"
        disabled={busy || !imageUrl}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        onClick={async () => {
          if (!imageUrl) return;
          setBusy(true);
          setError(null);
          try {
            const dataUrl = await renderPromoCanvas({
              sourceDataUrl: imageUrl,
              size: "1080x1920",
              template: "GERAL",
              overlayText: promoText || productName,
              bgColor: brand.brandColor || "#ffffff",
              brand: {
                logoDataUrl: brand.logoPath,
                logoMargin: brand.logoMargin,
                logoSize: brand.logoSize,
                logoOpacity: brand.logoOpacity,
              },
            });
            setPreview(dataUrl);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Gerando…" : "Gerar prévia story"}
      </button>
      {!imageUrl && <p className="text-xs text-amber-700">Defina URL da imagem na oferta para gerar a story.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {preview && (
        <img src={preview} alt="Prévia story 1080x1920" className="max-h-[520px] w-full rounded-lg border object-contain" />
      )}
      <p className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-800">
        <span className="font-semibold uppercase tracking-wide">Em breve</span> — publicar story no Instagram (API oficial).
      </p>
    </div>
  );
}
