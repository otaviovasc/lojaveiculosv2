import * as productSchema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { loadLocalEnv } from "../infrastructure/config/loadLocalEnv.js";
import { createDrizzleExternalBotManager } from "../infrastructure/db/crm/drizzleExternalBotManager.js";
import { createHttpExternalBotEventSender } from "../infrastructure/crm/bot/httpExternalBotEventSender.js";
import { runExternalBotEventWorkerOnce } from "../infrastructure/crm/bot/runExternalBotEventWorker.js";

loadLocalEnv();

async function main() {
  const client = postgres(requireEnv("DATABASE_URL"), { max: 1 });
  try {
    const db = drizzle(client, { schema: productSchema });
    const manager = createDrizzleExternalBotManager({
      db,
      modelVersion: requireEnv("CRM_EXTERNAL_BOT_MODEL_VERSION"),
    });
    const result = await runExternalBotEventWorkerOnce({
      eventSigningKey: requireEnv("CRM_EXTERNAL_BOT_EVENT_SIGNING_KEY"),
      outbox: manager.eventOutbox,
      sender: createHttpExternalBotEventSender({
        url: requireEnv("CRM_EXTERNAL_BOT_EVENT_URL"),
      }),
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

void main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ errorName: error instanceof Error ? error.name : "UnknownError", status: "failed" })}\n`,
  );
  process.exitCode = 1;
});
