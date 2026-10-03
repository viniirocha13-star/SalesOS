"use client";

import { useCallback, useRef, useState } from "react";
import {
  canvasDimensions,
  IMAGE_TEMPLATE_LABELS,
  templateAccentColor,
  type ImageCanvasSize,
  type ImageTemplateId,
} from "@/lib/plim/image-templates";
import { getImageProvider } from "@/lib/providers/image";
type BrandSettings = {
  logoPath: string | null;
  logoMargin: number;
  logoSize: number;
  logoOpacity: number;
  brandColor: string;
};

export function ImageLibraryEditor({
  brand,
  aiConfigured,
  imageAiConfigured,
}: {
  brand: BrandSettings;
  aiConfigured: boolean;
  imageAiConfigured: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState<ImageCanvasSize>("1080x1080");
  const [template, setTemplate] = useState<ImageTemplateId>("GERAL");
  const [overlayText, setOverlayText] = useState("");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderCanvas = useCallback(
    async (sourceDataUrl: string) => {
      const provider = getImageProvider();
      const { width, height } = canvasDimensions(size);
      let dataUrl = await provider.resize(sourceDataUrl, { width, height, fit: "cover" });
      if (brand.logoPath) {
        try {
          dataUrl = await provider.applyWatermark(dataUrl, {
            logoDataUrl: brand.logoPath,
            margin: brand.logoMargin,
            size: brand.logoSize,
            opacity: brand.logoOpacity,
          });
        } catch {
          /* logo opcional */
        }
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("imagem"));
        img.src = dataUrl;
      });
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const accent = templateAccentColor(template);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(0, height - 120, width, 120);
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.font = "bold 36px system-ui,sans-serif";
      ctx.fillText(IMAGE_TEMPLATE_LABELS[template], 32, height - 48);
      if (overlayText.trim()) {
        ctx.fillStyle = "#111827";
        ctx.font = "28px system-ui,sans-serif";
        wrapText(ctx, overlayText.trim(), 32, 80, width - 64, 34);
      }
      setPreview(canvas.toDataURL("image/png"));
    },
    [bgColor, brand, overlayText, size, template],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-violet-900">Editor de imagem</p>
        <p className="text-xs text-slate-500">
          Redimensionar, recortar (cover), fundo, marca d&apos;água com logo Plim (canto superior esquerdo) e texto.
          Não altere rótulo, embalagem ou marca do produto na arte final.
        </p>
        <input
          type="file"
          accept="image/*"
          className="text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const reader = new FileReader();
              const dataUrl = await new Promise<string>((res, rej) => {
                reader.onload = () => res(String(reader.result));
                reader.onerror = () => rej(new Error("leitura"));
                reader.readAsDataURL(file);
              });
              await renderCanvas(dataUrl);
            } finally {
              setBusy(false);
            }
          }}
        />
        <label className="block text-xs text-slate-600">
          Tamanho
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={size}
            onChange={(e) => setSize(e.target.value as ImageCanvasSize)}
          >
            <option value="1080x1080">1080×1080</option>
            <option value="1080x1920">1080×1920</option>
          </select>
        </label>
        <label className="block text-xs text-slate-600">
          Template
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={template}
            onChange={(e) => setTemplate(e.target.value as ImageTemplateId)}
          >
            {(Object.keys(IMAGE_TEMPLATE_LABELS) as ImageTemplateId[]).map((id) => (
              <option key={id} value={id}>{IMAGE_TEMPLATE_LABELS[id]}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-600">
          Cor de fundo (atrás do produto)
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="mt-1 h-8 w-full"
          />
        </label>
        <label className="block text-xs text-slate-600">
          Texto promocional (sem alterar o produto)
          <textarea
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            rows={3}
          />
        </label>
        <p className="text-xs text-slate-500">
          IA de imagem: {imageAiConfigured ? "interface pronta (chave configurada)" : "não configurado — sem OPENAI_API_KEY"}
        </p>
        {busy && <p className="text-sm text-violet-600">Processando…</p>}
      </div>
      <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-violet-900">Pré-visualização</p>
        <canvas ref={canvasRef} className="hidden" />
        {preview ? (
          <img src={preview} alt="Pré-visualização" className="mt-2 max-h-[480px] w-full object-contain" />
        ) : (
          <p className="mt-4 text-sm text-slate-400">Carregue uma imagem para editar.</p>
        )}
        <div className="mt-4 border-t pt-4">
          <p className="text-xs font-medium text-slate-600">MELHORAR COM IA (texto para ofertas)</p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            disabled={!aiConfigured}
            title={aiConfigured ? undefined : "OPENAI_API_KEY não configurada no servidor"}
            onClick={async () => {
              setAiNote(null);
              const productName = window.prompt("Nome do produto");
              if (!productName) return;
              const priceStr = window.prompt("Preço atual (opcional, número)");
              const discountStr = window.prompt("Desconto % (opcional)");
              const category = window.prompt("Categoria (opcional)") ?? undefined;
              const res = await fetch("/api/plim/ai/improve-text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productName,
                  currentPrice: priceStr ? Number(priceStr) : null,
                  discountPercent: discountStr ? Number(discountStr) : null,
                  category,
                }),
              });
              const json = (await res.json()) as { text?: string; error?: string };
              if (!res.ok) {
                setAiNote(json.error ?? "Falha");
                return;
              }
              setOverlayText(json.text ?? "");
              setAiNote("Texto gerado — revise antes de publicar.");
            }}
          >
            MELHORAR COM IA
          </button>
          {!aiConfigured && (
            <p className="mt-1 text-xs text-amber-700">Configure OPENAI_API_KEY no servidor para habilitar.</p>
          )}
          {aiNote && <p className="mt-2 text-xs text-slate-600">{aiNote}</p>}
        </div>
      </div>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}
