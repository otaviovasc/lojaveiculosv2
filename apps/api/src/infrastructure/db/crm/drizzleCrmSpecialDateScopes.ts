import { and, asc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import {
  crmChannelConnections,
  crmSpecialDateConfigs,
  storeEntitlements,
  stores,
  tenants,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmSpecialDateConfigScopePage } from "../../../domains/crm/ports/crmSpecialDateRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

const ACTIVE_MESSAGING_PROVIDERS = [
  "meta_cloud",
  "olx",
  "uazapi",
  "zapi",
] as const;

export async function listEnabledConfigScopes(
  db: DrizzleCrmClient,
  input: { cursor?: string; limit: number },
): Promise<CrmSpecialDateConfigScopePage> {
  const limit = Math.max(1, Math.min(100, Math.trunc(input.limit)));
  const cursor = parseCursor(input.cursor);
  const now = new Date();
  const rows = await db
    .selectDistinct({
      storeId: stores.id,
      tenantId: stores.tenantId,
    })
    .from(crmSpecialDateConfigs)
    .innerJoin(
      crmChannelConnections,
      and(
        eq(crmChannelConnections.id, crmSpecialDateConfigs.connectionId),
        eq(crmChannelConnections.storeId, crmSpecialDateConfigs.storeId),
        eq(crmChannelConnections.tenantId, crmSpecialDateConfigs.tenantId),
      ),
    )
    .innerJoin(
      stores,
      and(
        eq(stores.id, crmSpecialDateConfigs.storeId),
        eq(stores.tenantId, crmSpecialDateConfigs.tenantId),
      ),
    )
    .innerJoin(tenants, eq(tenants.id, stores.tenantId))
    .innerJoin(
      storeEntitlements,
      and(
        eq(storeEntitlements.storeId, stores.id),
        eq(storeEntitlements.tenantId, stores.tenantId),
        eq(storeEntitlements.featureKey, "crm"),
        eq(storeEntitlements.status, "active"),
        or(
          isNull(storeEntitlements.startsAt),
          lte(storeEntitlements.startsAt, now),
        ),
        or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
      ),
    )
    .where(
      and(
        eq(crmSpecialDateConfigs.enabled, true),
        eq(crmChannelConnections.state, "active"),
        inArray(crmChannelConnections.provider, ACTIVE_MESSAGING_PROVIDERS),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
        eq(tenants.isDeleted, false),
        isNull(tenants.deletedAt),
        cursor
          ? or(
              gt(stores.tenantId, cursor.tenantId),
              and(
                eq(stores.tenantId, cursor.tenantId),
                gt(stores.id, cursor.storeId),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(asc(stores.tenantId), asc(stores.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);
  return {
    nextCursor: hasMore && last ? `${last.tenantId}:${last.storeId}` : null,
    scopes: page.map((row) => ({
      storeId: row.storeId as StoreId,
      tenantId: row.tenantId as TenantId,
    })),
  };
}

function parseCursor(cursor: string | undefined) {
  if (!cursor) return null;
  const separator = cursor.indexOf(":");
  if (separator <= 0 || separator === cursor.length - 1) return null;
  return {
    storeId: cursor.slice(separator + 1),
    tenantId: cursor.slice(0, separator),
  };
}
