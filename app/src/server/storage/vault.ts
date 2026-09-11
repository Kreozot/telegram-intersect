import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Encrypts a Telegram session before SQLite persistence; the key lives outside the database. */
export function seal(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

/** Authenticates and decrypts a saved session during server startup; tampering fails closed. */
export function unseal(value: string, key: Buffer): string {
  const bytes = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}
