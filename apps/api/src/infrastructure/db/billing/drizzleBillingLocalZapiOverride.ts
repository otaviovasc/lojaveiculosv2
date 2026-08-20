import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { storeEntitlements } from "@lojaveiculosv2/db";
import type { BillingQuotaKey } from "../../../domains/billing/ports/billingQuotaGuard.js";
import type { DrizzleBillingQuotaClient } from "./drizzleBillingQuotaGuard.js";

export async function findLocalZapiTestOverrideLimit(
  db: DrizzleBillingQuotaClient,
  input: { quotaKey: BillingQuotaKey; storeId: string; tenantId: string },
  now: Date,
) {
  if (process.env.APP_ENV !== "local" || input.quotaKey !== "crm_zapi") {
    return null;
  }

  const rows = await db
    .select({
      endsAt: storeEntitlements.endsAt,
      metadata: storeEntitlements.metadata,
      startsAt: storeEntitlements.startsAt,
    })
    .from(storeEntitlements)
    .where(
      and(
        eq(storeEntitlements.featureKey, "crm_zapi"),
        eq(storeEntitlements.source, "local_seed_override"),
        eq(storeEntitlements.status, "active"),
        eq(storeEntitlements.storeId, input.storeId),
        eq(storeEntitlements.tenantId, input.tenantId),
        or(
          isNull(storeEntitlements.startsAt),
          lte(storeEntitlements.startsAt, now),
        ),
        or(isNull(storeEntitlements.endsAt), gt(storeEntitlements.endsAt, now)),
      ),
    )
    .limit(20);

  return rows.some((row) => isLocalZapiTestOverrideMetadata(row.metadata))
    ? 1
    : null;
}

export function isLocalZapiTestOverrideMetadata(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const metadata = value as Record<string, unknown>;
  return (
    metadata.billingBound === false &&
    metadata.fixture === "local_seed" &&
    metadata.overrideContractVersion === "2026-07-capability-v1" &&
    metadata.provider === "zapi" &&
    metadata.reason === "local_zapi_webhook_rehearsal" &&
    metadata.testInstance === true
  );
}
