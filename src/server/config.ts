import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface Config {
  dataDir: string;
  port: number;
  host: string;
  origin: string | null;
  accessKey: string;
  encryptionKey: Buffer;
  apiId: number;
  apiHash: string;
  maxSelectedPeople: number;
}

/** Parses a positive integer limit so invalid operator configuration fails at startup. */
export function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

/** Loads a stable local secret without printing it; used only by server configuration. */
function localSecret(directory: string, name: string): string {
  const file = resolve(directory, name);
  if (!existsSync(file))
    writeFileSync(file, randomBytes(32).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  return readFileSync(file, "utf8").trim();
}

/** Validates startup settings and provisions owner-only local secrets for application startup. */
export function loadConfig(): Config {
  const dataDir = resolve(process.env.DATA_DIR ?? "data");
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const host = process.env.HOST ?? "127.0.0.1";
  const origin = process.env.PUBLIC_ORIGIN ?? null;
  const remote = !["127.0.0.1", "localhost", "::1"].includes(host);
  if (origin && (new URL(origin).origin !== origin || !origin.startsWith("https://")))
    throw new Error("PUBLIC_ORIGIN must be an HTTPS origin without a trailing slash.");
  if (remote && (!origin || !process.env.APP_ACCESS_KEY || !process.env.SESSION_ENCRYPTION_KEY))
    throw new Error(
      "Remote binding requires PUBLIC_ORIGIN, APP_ACCESS_KEY and SESSION_ENCRYPTION_KEY.",
    );
  const accessKey = process.env.APP_ACCESS_KEY ?? localSecret(dataDir, "access-key");
  const encryptionHex = process.env.SESSION_ENCRYPTION_KEY ?? localSecret(dataDir, "session-key");
  if (accessKey.length < 24 || !/^[0-9a-f]{64}$/i.test(encryptionHex))
    throw new Error(
      "Use an access key of at least 24 characters and a 64-character hexadecimal encryption key.",
    );
  const port = Number(process.env.PORT ?? 4310);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid PORT.");
  const apiId = Number(process.env.TELEGRAM_API_ID ?? 0);
  if (!Number.isSafeInteger(apiId) || apiId < 0) throw new Error("Invalid TELEGRAM_API_ID.");
  return {
    dataDir,
    port,
    host,
    origin,
    accessKey,
    encryptionKey: Buffer.from(encryptionHex, "hex"),
    apiId,
    apiHash: process.env.TELEGRAM_API_HASH ?? "",
    maxSelectedPeople: parsePositiveInteger(
      process.env.MAX_SELECTED_PEOPLE,
      50,
      "MAX_SELECTED_PEOPLE",
    ),
  };
}
