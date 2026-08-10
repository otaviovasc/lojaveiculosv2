import { and, count, eq, gte, inArray, ne } from "drizzle-orm";
import {
  crmConnections,
  identityInvitations,
  storeMemberships,
  vehicleListings,
  vehiclePlateLookups,
} from "@lojaveiculosv2/db";
import type { BillingQuotaKey } from "../../../domains/billing/ports/billingQuotaGuard.js";
import type { DrizzleBillingQuotaClient } from "./drizzleBillingQuotaGuard.js";

export async function countBillingQuotaUsage(
  db: DrizzleBillingQuotaClient,
  input: { quotaKey: BillingQuotaKey; storeId: string; tenantId: string },
  periodStart: Date | null,
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
  if (input.quotaKey === "crm_zapi") {
    const [row] = await db
      .select({ value: count() })
      .from(crmConnections)
      .where(
        and(
          eq(crmConnections.storeId, input.storeId),
          eq(crmConnections.tenantId, input.tenantId),
          eq(crmConnections.provider, "zapi"),
          ne(crmConnections.status, "archived"),
        ),
      );
    return Number(row?.value ?? 0);
  }
  const [row] = await db
    .select({ value: count() })
    .from(vehiclePlateLookups)
    .where(
      and(
        eq(vehiclePlateLookups.storeId, input.storeId),
        eq(vehiclePlateLookups.tenantId, input.tenantId),
        ...(periodStart
          ? [gte(vehiclePlateLookups.fetchedAt, periodStart)]
          : []),
      ),
    );
  return Number(row?.value ?? 0);
}
