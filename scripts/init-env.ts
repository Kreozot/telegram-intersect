import { constants } from "node:fs";
import { copyFile, readFile, rename, writeFile } from "node:fs/promises";

export const TELEGRAM_API_ID_KEY = "TELEGRAM_API_ID";
export const TELEGRAM_API_HASH_KEY = "TELEGRAM_API_HASH";

export interface TelegramCredentials {
  readonly apiId: string;
  readonly apiHash: string;
}

/** Reads an active environment assignment without exposing unrelated configuration. */
export function readEnvValue(contents: string, key: string): string | null {
  const assignment = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`);
  let value: string | null = null;

  for (const line of contents.split(/\r?\n/u)) {
    const match = assignment.exec(line);
    if (!match) continue;
    const rawValue = match[1]?.trim() ?? "";
    value = rawValue.replace(/^(?:"(.*)"|'(.*)')$/u, "$1$2");
  }

  return value && value.length > 0 ? value : null;
}

/** Replaces each requested setting while preserving comments and unrelated environment values. */
export function updateEnvValues(
  contents: string,
  values: Readonly<Record<string, string>>,
): string {
  const newline = contents.includes("\r\n") ? "\r\n" : "\n";
  const lines = contents.split(/\r?\n/u);

  for (const [key, value] of Object.entries(values)) {
    const assignment = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);
    const firstIndex = lines.findIndex((line) => assignment.test(line));
    if (firstIndex === -1) {
      lines.push(`${key}=${value}`);
      continue;
    }

    lines[firstIndex] = `${key}=${value}`;
    for (let index = lines.length - 1; index > firstIndex; index -= 1) {
      if (assignment.test(lines[index] ?? "")) lines.splice(index, 1);
    }
  }

  return lines.join(newline);
}

/** Copies the public template only when configuration has not already been created. */
export async function ensureEnvFile(envPath: string, examplePath: string): Promise<boolean> {
  try {
    await copyFile(examplePath, envPath, constants.COPYFILE_EXCL);
    return true;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "EEXIST") return false;
    throw error;
  }
}

/** Persists credentials through a same-directory replacement to avoid a partially written file. */
export async function writeTelegramCredentials(
  envPath: string,
  credentials: TelegramCredentials,
): Promise<void> {
  const contents = await readFile(envPath, "utf8");
  const updated = updateEnvValues(contents, {
    [TELEGRAM_API_ID_KEY]: credentials.apiId,
    [TELEGRAM_API_HASH_KEY]: credentials.apiHash,
  });
  const temporaryPath = `${envPath}.tmp`;
  await writeFile(temporaryPath, updated, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, envPath);
}

/** Narrows filesystem failures so expected exclusive-copy conflicts can be handled safely. */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
