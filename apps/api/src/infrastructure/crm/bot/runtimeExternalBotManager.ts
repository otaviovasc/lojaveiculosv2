import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@lojaveiculosv2/db";
import { createDrizzleExternalBotManager } from "../../db/crm/drizzleExternalBotManager.js";

export function createRuntimeExternalBotManager(
  db: unknown,
  env: Record<string, string | undefined>,
) {
  const modelVersion = env.CRM_EXTERNAL_BOT_MODEL_VERSION?.trim();
  if (!modelVersion) return undefined;
  return createDrizzleExternalBotManager({
    db: db as PostgresJsDatabase<typeof schema>,
    modelVersion,
  });
}
