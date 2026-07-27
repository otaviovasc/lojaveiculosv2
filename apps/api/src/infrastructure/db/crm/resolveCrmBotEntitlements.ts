import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { storeEntitlements, stores, tenants } from "@lojaveiculosv2/db";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmBotEntitlementResolver(
  db: DrizzleCrmClient,
): ResolveCrmBotEntitlements {
  return async ({ storeId, tenantId }) => {
    const now = new Date();
    const rows = await db
      .select({ featureKey: storeEntitlements.featureKey })
      .from(storeEntitlements)
      .innerJoin(
        stores,
        and(
          eq(stores.id, storeEntitlements.storeId),
          eq(stores.tenantId, storeEntitlements.tenantId),
          eq(stores.isDeleted, false),
          isNull(stores.deletedAt),
        ),
      )
      .innerJoin(
        tenants,
        and(
          eq(tenants.id, storeEntitlements.tenantId),
          eq(tenants.isDeleted, false),
          isNull(tenants.deletedAt),
        ),
      )
      .where(
        and(
          eq(storeEntitlements.storeId, storeId),
          eq(storeEntitlements.tenantId, tenantId),
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
      .limit(100);

    return rows.map((row) => row.featureKey as EntitlementKey);
  };
}
