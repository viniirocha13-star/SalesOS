/**
 * CredentialVault — criptografa tokens da Meta antes de persistir.
 * Nunca envia access token para o browser.
 */
import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const VERSION = "v1";

function deriveKey(secret: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.APP_ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY não configurada");
    }
    return deriveKey("dev-only-insecure-encryption-key");
  }
  return deriveKey(secret);
}

export type VaultPayload = {
  ciphertext: string; // "v1:<iv_b64>:<tag_b64>:<data_b64>"
};

export const CredentialVault = {
  encrypt(plaintext: string): string {
    if (!plaintext) throw new Error("Texto vazio não pode ser criptografado");
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
  },

  decrypt(payload: string): string {
    if (!payload) throw new Error("Payload vazio");
    const [version, ivB64, tagB64, dataB64] = payload.split(":");
    if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
      throw new Error("Formato de credencial inválido");
    }
    const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  },

  /** Re-criptografa com a chave atual (útil após rotação de ENCRYPTION_KEY). */
  rotate(payload: string): string {
    return this.encrypt(this.decrypt(payload));
  },

  /** Invalida o valor retornando um blob sem conteúdo útil. */
  revoke(): string {
    return this.encrypt(`revoked:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`);
  },

  validate(payload: string | null | undefined): boolean {
    if (!payload) return false;
    try {
      const value = this.decrypt(payload);
      return Boolean(value) && !value.startsWith("revoked:");
    } catch {
      return false;
    }
  },

  mask(token?: string | null): string {
    if (!token) return "—";
    if (token.length < 10) return "••••";
    return `${token.slice(0, 4)}…${token.slice(-4)}`;
  },
};
