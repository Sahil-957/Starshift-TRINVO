import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for per-shop secrets at rest. CREDENTIALS_KEY is 32 random bytes,
 * base64. Losing it makes stored credentials unreadable (re-enter them).
 */
function key() {
  const k = Buffer.from(process.env.CREDENTIALS_KEY ?? "", "base64");
  if (k.length !== 32) throw new Error("CREDENTIALS_KEY must be 32 bytes, base64-encoded");
  return k;
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decryptJson<T>(encoded: string): T {
  const buf = Buffer.from(encoded, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8"));
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
