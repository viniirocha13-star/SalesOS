import type { PlimMarketplace } from "@prisma/client";
import { createHash } from "crypto";

export function buildOfferDuplicateHash(input: {
  marketplace: PlimMarketplace;
  productId?: string | null;
  originalLink?: string | null;
}): string {
  const key =
    input.productId?.trim() ||
    normalizeUrl(input.originalLink) ||
    "unknown";
  return createHash("sha256")
    .update(`${input.marketplace}:${key}`)
    .digest("hex")
    .slice(0, 32);
}

function normalizeUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    u.hash = "";
    u.search = "";
    return u.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}
