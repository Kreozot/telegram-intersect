import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import inquirer from "inquirer";
import {
  ensureEnvFile,
  readEnvValue,
  TELEGRAM_API_HASH_KEY,
  TELEGRAM_API_ID_KEY,
  writeTelegramCredentials,
} from "./init-env.js";

const envPath = resolve(".env");
const examplePath = resolve(".env.example");

/** Validates Telegram's numeric application identifier before it reaches server configuration. */
function validateApiId(value: string): true | string {
  return /^[1-9]\d*$/u.test(value.trim()) ? true : "Enter the numeric api_id shown by Telegram.";
}

/** Requires the application secret shown by Telegram while keeping its value hidden in the prompt. */
function validateApiHash(value: string): true | string {
  return value.trim().length > 0 ? true : "Enter the api_hash shown by Telegram.";
}

/** Guides a local owner through obtaining and safely storing Telegram application credentials. */
async function initializeEnvironment(): Promise<void> {
  console.log("\nTelegram Intersect setup\n");
  console.log("You need Telegram application credentials for your own account (not a bot token).");
  console.log("1. Open https://my.telegram.org/apps and sign in with your Telegram phone number.");
  console.log(
    "2. If asked, create an app. Any descriptive title is fine; choose Desktop as platform.",
  );
  console.log("3. Telegram will show api_id and api_hash. Keep api_hash private.");
  console.log("Official guide: https://core.telegram.org/api/obtaining_api_id\n");

  const created = await ensureEnvFile(envPath, examplePath);
  console.log(created ? "Created .env from .env.example." : "Found existing .env; keeping it.");

  const contents = await readFile(envPath, "utf8");
  const existingApiId = readEnvValue(contents, TELEGRAM_API_ID_KEY);
  const existingApiHash = readEnvValue(contents, TELEGRAM_API_HASH_KEY);

  if (existingApiId) console.log("TELEGRAM_API_ID is already configured.");
  if (existingApiHash) console.log("TELEGRAM_API_HASH is already configured.");
  if (existingApiId && existingApiHash) {
    console.log("\nNothing to change. Run npm start (or npm run dev for development).\n");
    return;
  }

  const apiId = existingApiId ?? (await askForApiId());
  const apiHash = existingApiHash ?? (await askForApiHash());

  await writeTelegramCredentials(envPath, { apiId, apiHash });
  console.log("\nSaved Telegram credentials to .env. Do not commit or share this file.");
  console.log("Setup is complete. Run npm start (or npm run dev for development).\n");
}

/** Prompts for a missing application identifier while rejecting invalid numeric input. */
async function askForApiId(): Promise<string> {
  const answer = await inquirer.prompt<{ apiId: string }>({
    type: "input",
    name: "apiId",
    message: "Telegram api_id:",
    validate: validateApiId,
  });
  return answer.apiId.trim();
}

/** Prompts for a missing application hash without echoing the secret to the terminal. */
async function askForApiHash(): Promise<string> {
  const answer = await inquirer.prompt<{ apiHash: string }>({
    type: "password",
    name: "apiHash",
    message: "Telegram api_hash:",
    mask: "*",
    validate: validateApiHash,
  });
  return answer.apiHash.trim();
}

await initializeEnvironment();
