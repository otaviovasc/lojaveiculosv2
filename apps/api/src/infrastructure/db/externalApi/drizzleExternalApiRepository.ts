import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  apiClientKeys,
  apiClients,
  storeEntitlements,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type {
  CreateExternalApiClientInput,
  ExternalApiAuthenticatedClient,
  ExternalApiClient,
  ExternalApiRepository,
} from "../../../domains/externalApi/ports/externalApiRepository.js";
import {
  countRecentExternalApiRequests,
  recordExternalApiRequest,
  reserveExternalApiIdempotencyKey,
} from "./drizzleExternalApiGovernance.js";

export type DrizzleExternalApiClient = PostgresJsDatabase<typeof schema>;

type ClientRow = typeof apiClients.$inferSelect;

export function createDrizzleExternalApiRepository(
  db: DrizzleExternalApiClient,
): ExternalApiRepository {
  return {
    async authenticateByKeyHash(input) {
      const [credential] = await db
        .select({
          clientId: apiClients.id,
          clientName: apiClients.name,
          keyId: apiClientKeys.id,
          keyPrefix: apiClientKeys.keyPrefix,
          scopes: apiClients.scopes,
          storeId: apiClients.storeId,
          tenantId: apiClients.tenantId,
        })
        .from(apiClientKeys)
        .innerJoin(apiClients, eq(apiClients.id, apiClientKeys.clientId))
        .where(
          and(
            eq(apiClientKeys.keyHash, input.keyHash),
            isNull(apiClientKeys.revokedAt),
            or(
              isNull(apiClientKeys.expiresAt),
              gt(apiClientKeys.expiresAt, input.now),
            ),
            eq(apiClients.status, "active"),
          ),
        )
        .limit(1);
      if (!credential) return null;

      const entitlements = await listActiveEntitlements(db, {
        storeId: credential.storeId,
        tenantId: credential.tenantId,
      });

      return {
        clientId: credential.clientId,
        clientName: credential.clientName,
        entitlements,
        keyId: credential.keyId,
        keyPrefix: credential.keyPrefix,
        scopes: toPermissionKeys(credential.scopes),
        storeId: credential.storeId as never,
        tenantId: credential.tenantId as never,
      } satisfies ExternalApiAuthenticatedClient;
    },
    async countRecentRequests(input) {
      return countRecentExternalApiRequests(db, input);
    },
    async createClient(input) {
      return db.transaction(async (transaction) => {
        const tx = transaction as DrizzleExternalApiClient;
        const [client] = await tx
          .insert(apiClients)
          .values({
            name: input.name,
            scopes: input.scopes,
            status: "active",
            storeId: input.storeId,
            tenantId: input.tenantId,
          })
          .returning();
        if (!client) throw new Error("External API client insert failed.");

        await tx.insert(apiClientKeys).values({
          clientId: client.id,
          keyHash: input.keyHash,
          keyPrefix: input.keyPrefix,
        });

        return toClient(client, [input.keyPrefix]);
      });
    },
    async listClients(input) {
      const [clients, keys] = await Promise.all([
        db
          .select()
          .from(apiClients)
          .where(
            and(
              eq(apiClients.storeId, input.storeId),
              eq(apiClients.tenantId, input.tenantId),
            ),
          )
          .limit(100),
        db.select().from(apiClientKeys).limit(500),
      ]);

      return clients.map((client) =>
        toClient(
          client,
          keys
            .filter((key) => key.clientId === client.id && !key.revokedAt)
            .map((key) => key.keyPrefix),
        ),
      );
    },
    async recordRequest(input) {
      return recordExternalApiRequest(db, input);
    },
    async reserveIdempotencyKey(input) {
      return reserveExternalApiIdempotencyKey(db, input);
    },
    async revokeClient(input) {
      return db.transaction(async (transaction) => {
        const tx = transaction as DrizzleExternalApiClient;
        const [client] = await tx
          .update(apiClients)
          .set({ status: "revoked" })
          .where(
            and(
              eq(apiClients.id, input.clientId),
              eq(apiClients.storeId, input.storeId),
              eq(apiClients.tenantId, input.tenantId),
            ),
          )
          .returning();
        if (!client) return null;

        await tx
          .update(apiClientKeys)
          .set({ revokedAt: new Date() })
          .where(eq(apiClientKeys.clientId, client.id));
        return toClient(client, []);
      });
    },
  };
}

async function listActiveEntitlements(
  db: DrizzleExternalApiClient,
  input: { storeId: string; tenantId: string },
): Promise<EntitlementKey[]> {
  const rows = await db
    .select({ featureKey: storeEntitlements.featureKey })
    .from(storeEntitlements)
    .where(
      and(
        eq(storeEntitlements.storeId, input.storeId),
        eq(storeEntitlements.tenantId, input.tenantId),
        or(
          eq(storeEntitlements.status, "active"),
          eq(storeEntitlements.status, "trialing"),
        ),
      ),
    )
    .limit(100);

  return rows.map((row) => row.featureKey as EntitlementKey);
}

function toClient(row: ClientRow, keyPrefixes: string[]): ExternalApiClient {
  return {
    createdAt: row.createdAt,
    id: row.id,
    keyPrefixes,
    name: row.name,
    scopes: toPermissionKeys(row.scopes),
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
  };
}

function toPermissionKeys(value: unknown): PermissionKey[] {
  return Array.isArray(value)
    ? value.filter((item): item is PermissionKey => typeof item === "string")
    : [];
}
