import { sql } from "drizzle-orm";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function lockEffectivePlanContract(
  db: DrizzleBillingClient,
  tenantId: string,
  storeId: string,
) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${storeId}:plan-activation`}, 31))`,
  );
}
