export type ImageTemplateId = "FITNESS" | "TENIS" | "ELETRONICOS" | "CASA" | "BELEZA" | "GERAL";

export type ImageCanvasSize = "1080x1080" | "1080x1920";

export const IMAGE_TEMPLATE_LABELS: Record<ImageTemplateId, string> = {
  FITNESS: "FITNESS",
  TENIS: "TÊNIS",
  ELETRONICOS: "ELETRÔNICOS",
  CASA: "CASA",
  BELEZA: "BELEZA",
  GERAL: "GERAL",
};

export function canvasDimensions(size: ImageCanvasSize): { width: number; height: number } {
  if (size === "1080x1920") return { width: 1080, height: 1920 };
  return { width: 1080, height: 1080 };
}

export function templateAccentColor(id: ImageTemplateId): string {
  switch (id) {
    case "FITNESS":
      return "#059669";
    case "TENIS":
      return "#2563EB";
    case "ELETRONICOS":
      return "#7C3AED";
    case "CASA":
      return "#D97706";
    case "BELEZA":
      return "#DB2777";
    default:
      return "#4F46E5";
  }
}
