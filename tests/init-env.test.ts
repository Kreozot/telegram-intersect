import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  ensureEnvFile,
  readEnvValue,
  updateEnvValues,
  writeTelegramCredentials,
} from "../scripts/init-env.js";

test("reads the last active non-empty environment assignment", () => {
  const contents = [
    "# TELEGRAM_API_ID=ignored",
    "TELEGRAM_API_ID=123",
    'export TELEGRAM_API_HASH="secret"',
    "TELEGRAM_API_ID=456",
  ].join("\n");

  assert.equal(readEnvValue(contents, "TELEGRAM_API_ID"), "456");
  assert.equal(readEnvValue(contents, "TELEGRAM_API_HASH"), "secret");
  assert.equal(readEnvValue("TELEGRAM_API_HASH=", "TELEGRAM_API_HASH"), null);
});

test("updates credentials without changing unrelated settings", () => {
  const updated = updateEnvValues(
    "TELEGRAM_API_ID=\nHOST=127.0.0.1\nTELEGRAM_API_ID=old\nTELEGRAM_API_HASH=\n",
    {
      TELEGRAM_API_ID: "123",
      TELEGRAM_API_HASH: "secret",
    },
  );

  assert.equal(updated, "TELEGRAM_API_ID=123\nHOST=127.0.0.1\nTELEGRAM_API_HASH=secret\n");
});

test("copies the template once and persists credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "telegram-intersect-init-"));
  const examplePath = join(directory, ".env.example");
  const envPath = join(directory, ".env");
  await writeFile(examplePath, "TELEGRAM_API_ID=\nTELEGRAM_API_HASH=\nPORT=4310\n", "utf8");

  assert.equal(await ensureEnvFile(envPath, examplePath), true);
  await writeTelegramCredentials(envPath, { apiId: "123", apiHash: "secret" });
  assert.equal(await ensureEnvFile(envPath, examplePath), false);
  assert.equal(
    await readFile(envPath, "utf8"),
    "TELEGRAM_API_ID=123\nTELEGRAM_API_HASH=secret\nPORT=4310\n",
  );
});
