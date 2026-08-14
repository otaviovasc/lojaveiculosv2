import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { integrationJobs } from "@lojaveiculosv2/db";
import type { MarketplaceJob } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import { toPublicJob } from "./drizzleMarketplaceJobs.js";

export function recoverStaleRunningJobs(
  db: DrizzleMarketplaceClient,
  input: {
    limit: number;
    now: Date;
    scope: { storeId: string; tenantId: string };
  },
): Promise<MarketplaceJob[]> {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleMarketplaceClient;
    const staleFilter = and(
      eq(integrationJobs.storeId, input.scope.storeId),
      eq(integrationJobs.tenantId, input.scope.tenantId),
      eq(integrationJobs.status, "running"),
      lte(integrationJobs.dispatchLeaseExpiresAt, input.now),
    );
    const candidates = await client
      .select({ id: integrationJobs.id })
      .from(integrationJobs)
      .where(staleFilter)
      .orderBy(asc(integrationJobs.dispatchLeaseExpiresAt))
      .limit(input.limit)
      .for("update", { skipLocked: true });
    if (candidates.length === 0) return [];
    const rows = await client
      .update(integrationJobs)
      .set({
        dispatchLeaseExpiresAt: null,
        dispatchLeaseOwner: null,
        metadata: sql`${integrationJobs.metadata} || jsonb_build_object('reconciliationRequired', true, 'recoveryReason', 'dispatch_lease_expired')`,
        providerOperationExpiresAt: null,
        providerOperationTokenCiphertext: null,
        reconciliationAttemptCount: 0,
        reconciliationLastCheckedAt: null,
        reconciliationLeaseExpiresAt: null,
        reconciliationLeaseOwner: null,
        reconciliationNextAttemptAt: null,
        status: "submitted",
        updatedAt: input.now,
      })
      .where(
        and(
          inArray(
            integrationJobs.id,
            candidates.map(({ id }) => id),
          ),
          staleFilter,
        ),
      )
      .returning();
    return Promise.all(
      rows.map((row) => toPublicJob(client, row, input.scope)),
    );
  });
}
