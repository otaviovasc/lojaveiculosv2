import { and, eq, inArray, max } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { apiClientKeys, apiRequestLogs } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";

type Database = PostgresJsDatabase<typeof schema>;

export async function readExternalApiClientMetadata(
  db: Database,
  input: { storeId: string; tenantId: string },
  clientIds: string[],
) {
  const [keys, usage] = await Promise.all([
    db
      .select()
      .from(apiClientKeys)
      .where(inArray(apiClientKeys.clientId, clientIds)),
    db
      .select({
        clientId: apiRequestLogs.clientId,
        lastUsedAt: max(apiRequestLogs.createdAt),
      })
      .from(apiRequestLogs)
      .where(
        and(
          inArray(apiRequestLogs.clientId, clientIds),
          eq(apiRequestLogs.storeId, input.storeId),
          eq(apiRequestLogs.tenantId, input.tenantId),
        ),
      )
      .groupBy(apiRequestLogs.clientId),
  ]);

  return {
    keyPrefixesByClient: new Map(
      clientIds.map((clientId) => [
        clientId,
        keys
          .filter((key) => key.clientId === clientId && !key.revokedAt)
          .map((key) => key.keyPrefix),
      ]),
    ),
    lastUsedAtByClient: new Map(
      usage.map((row) => [row.clientId, row.lastUsedAt]),
    ),
  };
}
