import { and, count, eq, inArray } from "drizzle-orm";
import {
  billingQuotaUsageReservations,
  identityInvitations,
  storeMemberships,
  vehicleListings,
} from "@lojaveiculosv2/db";
import type { BillingQuotaKey } from "../../../domains/billing/ports/billingQuotaGuard.js";
import type { DrizzleBillingQuotaClient } from "./drizzleBillingQuotaGuard.js";

export async function countBillingQuotaUsage(
  db: DrizzleBillingQuotaClient,
  input: { quotaKey: BillingQuotaKey; storeId: string; tenantId: string },
  usageWindow: { end: Date; start: Date } | null,
) {
  if (input.quotaKey === "seller") {
    const [[members], [invitations]] = await Promise.all([
      db
        .select({ value: count() })
        .from(storeMemberships)
        .where(
          and(
            eq(storeMemberships.storeId, input.storeId),
            eq(storeMemberships.tenantId, input.tenantId),
            eq(storeMemberships.status, "active"),
          ),
        ),
      db
        .select({ value: count() })
        .from(identityInvitations)
        .where(
          and(
            eq(identityInvitations.storeId, input.storeId),
            eq(identityInvitations.tenantId, input.tenantId),
            inArray(identityInvitations.status, ["pending", "sent"]),
          ),
        ),
    ]);
    return Number(members?.value ?? 0) + Number(invitations?.value ?? 0);
  }
  if (input.quotaKey === "vehicle") {
    const [row] = await db
      .select({ value: count() })
      .from(vehicleListings)
      .where(
        and(
          eq(vehicleListings.storeId, input.storeId),
          eq(vehicleListings.tenantId, input.tenantId),
          eq(vehicleListings.isDeleted, false),
        ),
      );
    return Number(row?.value ?? 0);
  }
  if (!usageWindow) return 0;
  const [row] = await db
    .select({ value: count() })
    .from(billingQuotaUsageReservations)
    .where(
      and(
        eq(billingQuotaUsageReservations.storeId, input.storeId),
        eq(billingQuotaUsageReservations.tenantId, input.tenantId),
        eq(billingQuotaUsageReservations.quotaKey, "plate_lookup"),
        eq(billingQuotaUsageReservations.periodStart, usageWindow.start),
        inArray(billingQuotaUsageReservations.status, [
          "reserved",
          "succeeded",
          "provider_failed",
        ]),
      ),
    );
  return Number(row?.value ?? 0);
}
