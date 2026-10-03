import {
  canvasDimensions,
  IMAGE_TEMPLATE_LABELS,
  templateAccentColor,
  type ImageCanvasSize,
  type ImageTemplateId,
} from "@/lib/plim/image-templates";

export type PromoCanvasBrand = {
  logoDataUrl: string | null;
  logoMargin: number;
  logoSize: number;
  logoOpacity: number;
};

export async function renderPromoCanvas(options: {
  sourceDataUrl: string;
  size: ImageCanvasSize;
  template: ImageTemplateId;
  overlayText: string;
  bgColor: string;
  brand: PromoCanvasBrand;
}): Promise<string> {
  const { width, height } = canvasDimensions(options.size);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  ctx.fillStyle = options.bgColor;
  ctx.fillRect(0, 0, width, height);

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Falha ao carregar imagem da oferta"));
    img.src = options.sourceDataUrl;
  });

  const scale = Math.max(width / img.width, height / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);

  const accent = templateAccentColor(options.template);
  const barH = options.size === "1080x1920" ? 200 : 120;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(0, height - barH, width, barH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.font = `bold ${options.size === "1080x1920" ? 48 : 36}px system-ui,sans-serif`;
  ctx.fillText(IMAGE_TEMPLATE_LABELS[options.template], 32, height - barH / 2);

  if (options.overlayText.trim()) {
    ctx.fillStyle = "#111827";
    ctx.font = `${options.size === "1080x1920" ? 36 : 28}px system-ui,sans-serif`;
    wrapText(ctx, options.overlayText.trim(), 32, 80, width - 64, options.size === "1080x1920" ? 42 : 34);
  }

  if (options.brand.logoDataUrl) {
    try {
      const logo = new Image();
      await new Promise<void>((res, rej) => {
        logo.onload = () => res();
        logo.onerror = () => rej(new Error("logo"));
        logo.src = options.brand.logoDataUrl!;
      });
      const ls = options.brand.logoSize;
      ctx.globalAlpha = options.brand.logoOpacity;
      ctx.drawImage(logo, options.brand.logoMargin, options.brand.logoMargin, ls, ls);
      ctx.globalAlpha = 1;
    } catch {
      /* logo opcional */
    }
  }

  return canvas.toDataURL("image/png");
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
