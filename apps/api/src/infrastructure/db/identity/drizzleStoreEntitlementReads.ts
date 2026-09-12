import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { storeEntitlements } from "@lojaveiculosv2/db";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export async function resolveStoreEntitlements(
  db: DrizzleAccountProvisioningClient,
  storeId: string,
  now: Date = new Date(),
) {
  const rows = await db
    .select({ entitlement: storeEntitlements.featureKey })
    .from(storeEntitlements)
    .where(
      and(
        eq(storeEntitlements.storeId, storeId),
        eq(storeEntitlements.status, "active"),
        or(
          isNull(storeEntitlements.startsAt),
          lte(storeEntitlements.startsAt, now),
        ),
        or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
      ),
    )
    .limit(100);
  return rows.map((row) => row.entitlement as EntitlementKey);
}
