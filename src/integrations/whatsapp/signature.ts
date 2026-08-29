import crypto from "crypto";

export function verifyMetaSignature(raw: string, header: string | null, secret = process.env.META_APP_SECRET) {
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function verifyTokenMatches(token: string | null) {
  const expected = process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  return Boolean(expected && token && token === expected);
}
