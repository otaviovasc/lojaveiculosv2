import {
  and,
  eq,
  getTableColumns,
  gt,
  inArray,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import {
  crmConnections,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
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
      const now = new Date();
      const [row] = await db
        .select(getTableColumns(crmConnections))
        .from(crmConnections)
        .innerJoin(
          stores,
          and(
            eq(stores.id, crmConnections.storeId),
            eq(stores.tenantId, crmConnections.tenantId),
            eq(stores.isDeleted, false),
            isNull(stores.deletedAt),
          ),
        )
        .innerJoin(
          tenants,
          and(
            eq(tenants.id, crmConnections.tenantId),
            eq(tenants.isDeleted, false),
            isNull(tenants.deletedAt),
          ),
        )
        .innerJoin(
          storeEntitlements,
          and(
            eq(storeEntitlements.storeId, crmConnections.storeId),
            eq(storeEntitlements.tenantId, crmConnections.tenantId),
            eq(storeEntitlements.featureKey, "crm"),
            or(
              eq(storeEntitlements.status, "active"),
              eq(storeEntitlements.status, "trialing"),
            ),
            or(
              isNull(storeEntitlements.startsAt),
              lte(storeEntitlements.startsAt, now),
            ),
            or(
              isNull(storeEntitlements.endsAt),
              gt(storeEntitlements.endsAt, now),
            ),
          ),
        )
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
          ...(input.credentialsRef
            ? { credentialsRef: input.credentialsRef }
            : {}),
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.externalConnectionId !== undefined
            ? { externalConnectionId: input.externalConnectionId }
            : {}),
          ...(input.externalInstanceId !== undefined
            ? { externalInstanceId: input.externalInstanceId }
            : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.webhookUrl !== undefined
            ? { webhookUrl: input.webhookUrl }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmConnections.id, input.connectionId),
            eq(crmConnections.storeId, input.storeId),
            eq(crmConnections.tenantId, input.tenantId),
          ),
        )
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
