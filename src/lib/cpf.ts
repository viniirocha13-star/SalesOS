import crypto from "crypto";
import { maskCpf } from "@/lib/pii";

const KEY = () => {
  const raw = process.env.APP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || "dev-only-encryption-key-not-for-prod";
  return crypto.createHash("sha256").update(raw).digest();
};

export function normalizeCpf(input: string) {
  return input.replace(/\D/g, "");
}

export function isValidCpf(input: string) {
  const cpf = normalizeCpf(input);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (const d of base) {
      sum += Number(d) * factor;
      factor -= 1;
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function encryptCpf(input: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY(), iv);
  const enc = Buffer.concat([cipher.update(normalizeCpf(input), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptCpf(payload: string) {
  const [ivH, tagH, dataH] = payload.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY(), Buffer.from(ivH, "hex"));
  decipher.setAuthTag(Buffer.from(tagH, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataH, "hex")), decipher.final()]).toString("utf8");
}

export function cpfPromptSafe(collected: boolean, valid: boolean) {
  return { cpf_collected: collected, cpf_valid: valid, cpf: undefined };
}

export { maskCpf };
