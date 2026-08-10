import {
  and,
  eq,
  getTableColumns,
  gt,
  isNull,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import {
  crmConnections,
  crmWhatsappMessages,
  crmWhatsappSessions,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function abandonedZapiConditions(cutoff: Date) {
  return and(
    eq(crmConnections.provider, "zapi"),
    eq(crmConnections.status, "sandbox"),
    lte(crmConnections.updatedAt, cutoff),
    sql`not (${crmConnections.metadata} @> '{"supportHold":true}'::jsonb)`,
    notExists(
      sql`select 1 from ${crmWhatsappSessions} where ${crmWhatsappSessions.connectionId} = ${crmConnections.id}`,
    ),
    notExists(
      sql`select 1 from ${crmWhatsappMessages} where ${crmWhatsappMessages.connectionId} = ${crmConnections.id}`,
    ),
  );
}

export function activeCrmConnectionQuery(db: DrizzleCrmClient, now: Date) {
  return db
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
        or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
      ),
    );
}

export function toCrmConnection(
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

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
