export interface ImageResizeOptions {
  width: number;
  height: number;
  fit?: "cover" | "contain";
}

export interface WatermarkLogoOptions {
  logoDataUrl: string;
  margin: number;
  size: number;
  opacity: number;
}

export interface ImageProvider {
  resize(sourceDataUrl: string, options: ImageResizeOptions): Promise<string>;
  applyWatermark(sourceDataUrl: string, logo: WatermarkLogoOptions): Promise<string>;
  isAiConfigured(): boolean;
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = dataUrl;
  });
}

function ensureBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("ImageProvider local requer ambiente com canvas (navegador)");
  }
}

export class LocalImageProvider implements ImageProvider {
  isAiConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  async resize(sourceDataUrl: string, options: ImageResizeOptions): Promise<string> {
    ensureBrowser();
    const img = await loadImage(sourceDataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = options.width;
    canvas.height = options.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    const fit = options.fit ?? "cover";
    const scale =
      fit === "cover"
        ? Math.max(options.width / img.width, options.height / img.height)
        : Math.min(options.width / img.width, options.height / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (options.width - w) / 2;
    const y = (options.height - h) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, options.width, options.height);
    ctx.drawImage(img, x, y, w, h);
    return canvas.toDataURL("image/png");
  }

  async applyWatermark(sourceDataUrl: string, logo: WatermarkLogoOptions): Promise<string> {
    ensureBrowser();
    const [base, logoImg] = await Promise.all([loadImage(sourceDataUrl), loadImage(logo.logoDataUrl)]);
    const canvas = document.createElement("canvas");
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.drawImage(base, 0, 0);
    ctx.globalAlpha = logo.opacity;
    const size = logo.size;
    ctx.drawImage(logoImg, logo.margin, logo.margin, size, size);
    ctx.globalAlpha = 1;
    return canvas.toDataURL("image/png");
  }
}

export class SimulationImageProvider implements ImageProvider {
  async resize(sourceDataUrl: string, _options: ImageResizeOptions) {
    return sourceDataUrl;
  }
  async applyWatermark(sourceDataUrl: string, _logo: WatermarkLogoOptions) {
    return sourceDataUrl;
  }
  isAiConfigured() {
    return false;
  }
}

export function getImageProvider(): ImageProvider {
  if (typeof window !== "undefined") return new LocalImageProvider();
  return new SimulationImageProvider();
}
