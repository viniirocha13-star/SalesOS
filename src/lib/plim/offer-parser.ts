import type { PlimMarketplace } from "@prisma/client";
import { detectMarketplace } from "@/lib/affiliates";

export type ParsedOfferInput = {
  productName: string;
  description?: string;
  originalPrice?: number;
  currentPrice?: number;
  discountPercent?: number;
  coupon?: string;
  originalLink?: string;
  marketplace: PlimMarketplace;
  productId?: string;
};

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const COUPON_RE = /(?:cupom|coupon|code)\s*[:#]?\s*([A-Z0-9_-]{3,24})/i;
const PRICE_PAIR_RE =
  /(?:de\s*)?R\$\s*([\d.,]+)\s*(?:por|→|->|para|-)\s*R\$\s*([\d.,]+)/i;
const PRICE_SINGLE_RE = /R\$\s*([\d.,]+)/gi;

function parseBrMoney(raw: string): number | undefined {
  const n = raw.replace(/\./g, "").replace(",", ".");
  const v = Number(n);
  return Number.isFinite(v) ? v : undefined;
}

function extractProductId(url: string, marketplace: PlimMarketplace): string | undefined {
  try {
    const u = new URL(url);
    if (marketplace === "AMAZON") {
      const m = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{8,12})/i);
      return m?.[1];
    }
    if (marketplace === "MERCADO_LIVRE") {
      const m = u.pathname.match(/\/(?:p|MLB-?\d+)/i) ?? u.pathname.match(/(MLB\d+)/i);
      return m?.[0]?.replace(/^\//, "");
    }
    if (marketplace === "SHOPEE") {
      const m = u.pathname.match(/-i\.(\d+\.\d+)/) ?? u.pathname.match(/product\/(\d+)/);
      return m?.[1];
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function parsePastedOfferText(text: string): ParsedOfferInput {
  const trimmed = text.trim();
  const urls = trimmed.match(URL_RE) ?? [];
  const originalLink = urls[0];
  const marketplace = originalLink ? detectMarketplace(originalLink) ?? "OUTRO" : "OUTRO";

  let originalPrice: number | undefined;
  let currentPrice: number | undefined;
  const pair = trimmed.match(PRICE_PAIR_RE);
  if (pair) {
    originalPrice = parseBrMoney(pair[1]);
    currentPrice = parseBrMoney(pair[2]);
  } else {
    const prices = [...trimmed.matchAll(PRICE_SINGLE_RE)].map((m) => parseBrMoney(m[1])).filter(
      (n): n is number => n !== undefined,
    );
    if (prices.length >= 2) {
      originalPrice = prices[0];
      currentPrice = prices[1];
    } else if (prices.length === 1) {
      currentPrice = prices[0];
    }
  }

  let discountPercent: number | undefined;
  if (originalPrice && currentPrice && originalPrice > currentPrice) {
    discountPercent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  const coupon = trimmed.match(COUPON_RE)?.[1];
  const lines = trimmed
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.match(URL_RE) && !l.match(/^R\$/));
  const productName = lines[0]?.slice(0, 240) || "Oferta importada";

  const productId = originalLink ? extractProductId(originalLink, marketplace) : undefined;

  return {
    productName,
    description: lines.slice(1).join("\n").slice(0, 4000) || undefined,
    originalPrice,
    currentPrice,
    discountPercent,
    coupon,
    originalLink,
    marketplace,
    productId,
  };
}

export function parseOfferCsvRow(row: Record<string, string>): ParsedOfferInput | null {
  const productName = row.produto || row.product || row.nome || row.title;
  if (!productName?.trim()) return null;
  const link = row.link || row.url || row.originalLink;
  const marketplace = link ? detectMarketplace(link) ?? "OUTRO" : "OUTRO";
  const op = row.preco_anterior || row.originalPrice;
  const cp = row.preco || row.currentPrice;
  return {
    productName: productName.trim(),
    description: row.descricao || row.description,
    originalPrice: op ? parseBrMoney(op) : undefined,
    currentPrice: cp ? parseBrMoney(cp) : undefined,
    coupon: row.cupom || row.coupon,
    originalLink: link,
    marketplace,
    productId: link ? extractProductId(link, marketplace) : undefined,
  };
}
