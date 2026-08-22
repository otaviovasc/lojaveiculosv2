import { and, asc, eq, isNull } from "drizzle-orm";
import { stores } from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export function listActiveBillingStores(
  db: DrizzleBillingClient,
  tenantId: string,
) {
  return db
    .select()
    .from(stores)
    .where(
      and(
        eq(stores.tenantId, tenantId),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    )
    .orderBy(asc(stores.tradingName), asc(stores.id));
}
