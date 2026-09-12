import { integrationJobs } from "@lojaveiculosv2/db";
import type { MarketplaceJob } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import {
  submittedOwnerFilter,
  terminalReconciliationValues,
  toPublicJob,
} from "./drizzleMarketplaceJobs.js";
import { applyProviderListingTransition } from "./drizzleMarketplaceProviderListingTransition.js";
import { sanitizeMarketplaceMetadata } from "./drizzleMarketplaceMetadata.js";

type OwnerInput = {
  jobId: string;
  leaseOwner: string;
  storeId: string;
  tenantId: string;
};

export async function rescheduleSubmittedJob(
  db: DrizzleMarketplaceClient,
  input: OwnerInput & {
    checkedAt: Date;
    metadata: Record<string, unknown>;
    nextAttemptAt: Date | null;
  },
): Promise<MarketplaceJob | null> {
  const [row] = await db
    .update(integrationJobs)
    .set({
      metadata: sanitizeMarketplaceMetadata(input.metadata),
      reconciliationLastCheckedAt: input.checkedAt,
      reconciliationLeaseExpiresAt: null,
      reconciliationLeaseOwner: null,
      reconciliationNextAttemptAt: input.nextAttemptAt,
      updatedAt: input.checkedAt,
    })
    .where(submittedOwnerFilter(input))
    .returning();
  return row ? toPublicJob(db, row, input) : null;
}

export function completeSubmittedJob(
  db: DrizzleMarketplaceClient,
  input: OwnerInput & {
    completedAt: Date;
    externalId: string | null;
    listingId: string;
    metadata: Record<string, unknown>;
  },
): Promise<MarketplaceJob | null> {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleMarketplaceClient;
    const metadata = sanitizeMarketplaceMetadata(input.metadata);
    const [row] = await client
      .update(integrationJobs)
      .set({
        completedAt: input.completedAt,
        errorMessage: null,
        metadata,
        ...terminalReconciliationValues(input.completedAt),
        status: "succeeded",
      })
      .where(submittedOwnerFilter(input))
      .returning();
    if (!row) return null;
    const job = await toPublicJob(client, row, input);
    await applyProviderListingTransition(client, job, {
      externalId: input.externalId,
      listingId: input.listingId,
      metadata,
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    return job;
  });
}

export async function failSubmittedJob(
  db: DrizzleMarketplaceClient,
  input: OwnerInput & {
    completedAt: Date;
    errorMessage: string;
    metadata: Record<string, unknown>;
  },
): Promise<MarketplaceJob | null> {
  const [row] = await db
    .update(integrationJobs)
    .set({
      completedAt: input.completedAt,
      errorMessage: input.errorMessage,
      metadata: sanitizeMarketplaceMetadata(input.metadata),
      ...terminalReconciliationValues(input.completedAt),
      status: "failed",
    })
    .where(submittedOwnerFilter(input))
    .returning();
  return row ? toPublicJob(db, row, input) : null;
}
