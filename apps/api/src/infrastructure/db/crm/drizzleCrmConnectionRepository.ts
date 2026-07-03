import { and, eq, inArray } from "drizzle-orm";
import { crmConnections } from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmConnectionRepository(
  db: DrizzleCrmClient,
): CrmConnectionRepository {
  return {
    async findConnectionById(connectionId) {
      const [row] = await db
        .select()
        .from(crmConnections)
        .where(eq(crmConnections.id, connectionId))
        .limit(1);

      return row ? toCrmConnection(row) : null;
    },
    async listConnections(input) {
      const filters = [
        eq(crmConnections.storeId, input.storeId),
        eq(crmConnections.tenantId, input.tenantId),
      ];
      if (input.providers?.length) {
        filters.push(inArray(crmConnections.provider, [...input.providers]));
      }

      const rows = await db
        .select()
        .from(crmConnections)
        .where(and(...filters));

      return rows.map(toCrmConnection);
    },
    async updateConnection(input) {
      const [row] = await db
        .update(crmConnections)
        .set({
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.status ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(crmConnections.id, input.connectionId))
        .returning();
      return row ? toCrmConnection(row) : null;
    },
  };
}

function toCrmConnection(
  row: typeof crmConnections.$inferSelect,
): CrmConnection {
  return {
    credentialsRef: readRecord(row.credentialsRef),
    displayName: row.displayName,
    externalConnectionId: row.externalConnectionId,
    externalInstanceId: row.externalInstanceId,
    id: row.id,
    metadata: readRecord(row.metadata),
    phone: row.phone,
    provider: row.provider,
    status: row.status,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    webhookUrl: row.webhookUrl,
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
