import { and, eq } from "drizzle-orm";
import { integrationAccounts, integrationJobs } from "@lojaveiculosv2/db";
import type {
  MarketplaceJob,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { MarketplaceCredentialCodec } from "../../marketplace/marketplaceCredentialCodec.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import { toJob } from "./drizzleMarketplaceMappers.js";
import { sanitizeMarketplaceMetadata } from "./drizzleMarketplaceMetadata.js";
import { applyProviderListingTransition } from "./drizzleMarketplaceProviderListingTransition.js";

export async function markJobRunning(
  db: DrizzleMarketplaceClient,
  input: {
    dispatchLeaseExpiresAt: Date;
    dispatchLeaseOwner: string;
    jobId: string;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceJob | null> {
  const [row] = await db
    .update(integrationJobs)
    .set({
      dispatchLeaseExpiresAt: input.dispatchLeaseExpiresAt,
      dispatchLeaseOwner: input.dispatchLeaseOwner,
      status: "running",
    })
    .where(and(jobScopeFilter(input), eq(integrationJobs.status, "queued")))
    .returning();
  return row ? toPublicJob(db, row, input) : null;
}

export async function findSyncJob(
  db: DrizzleMarketplaceClient,
  input: { jobId: string; storeId: string; tenantId: string },
): Promise<MarketplaceJob | null> {
  const [row] = await db
    .select()
    .from(integrationJobs)
    .where(jobScopeFilter(input))
    .limit(1);
  return row ? toPublicJob(db, row, input) : null;
}

export async function markJobFailed(
  db: DrizzleMarketplaceClient,
  input: {
    completedAt: Date;
    dispatchLeaseOwner: string;
    errorMessage: string;
    jobId: string;
    metadata?: Record<string, unknown>;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceJob | null> {
  return updateRunningClaim(db, input, {
    completedAt: input.completedAt,
    errorMessage: input.errorMessage,
    ...(input.metadata
      ? { metadata: sanitizeMarketplaceMetadata(input.metadata) }
      : {}),
    ...terminalReconciliationValues(input.completedAt),
    status: "failed",
  });
}

export function markJobCompleted(
  db: DrizzleMarketplaceClient,
  input: {
    completedAt: Date;
    dispatchLeaseOwner: string;
    externalId?: string | null;
    jobId: string;
    listingId?: string | null;
    metadata?: Record<string, unknown>;
    provider: MarketplaceProvider;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceJob | null> {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleMarketplaceClient;
    const metadata = sanitizeMarketplaceMetadata(input.metadata ?? {});
    const job = await updateRunningClaim(client, input, {
      completedAt: input.completedAt,
      errorMessage: null,
      ...(input.metadata ? { metadata } : {}),
      ...terminalReconciliationValues(input.completedAt),
      status: "succeeded",
    });
    if (!job) return null;
    await applyProviderListingTransition(client, job, {
      externalId: input.externalId ?? null,
      listingId: input.listingId ?? null,
      metadata,
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    return job;
  });
}

export async function markJobSubmitted(
  db: DrizzleMarketplaceClient,
  codec: MarketplaceCredentialCodec,
  input: {
    dispatchLeaseOwner: string;
    jobId: string;
    listingId: string;
    metadata: Record<string, unknown>;
    nextAttemptAt: Date;
    operationExpiresAt: Date | null;
    operationToken: string | null;
    provider: MarketplaceProvider;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceJob | null> {
  return updateRunningClaim(db, input, {
    completedAt: null,
    errorMessage: null,
    metadata: sanitizeMarketplaceMetadata(input.metadata),
    providerOperationExpiresAt: input.operationExpiresAt,
    providerOperationTokenCiphertext: input.operationToken
      ? codec.encryptSecret(input.operationToken)
      : null,
    reconciliationAttemptCount: 0,
    reconciliationLastCheckedAt: null,
    reconciliationLeaseExpiresAt: null,
    reconciliationLeaseOwner: null,
    reconciliationNextAttemptAt: input.nextAttemptAt,
    status: "submitted",
  });
}

export async function updateJob(
  db: DrizzleMarketplaceClient,
  input: { jobId: string; storeId: string; tenantId: string },
  values: Partial<typeof integrationJobs.$inferInsert>,
): Promise<MarketplaceJob> {
  const [row] = await db
    .update(integrationJobs)
    .set(values)
    .where(jobScopeFilter(input))
    .returning();
  if (!row) throw new Error(`Marketplace job not found: ${input.jobId}`);
  return toPublicJob(db, row, input);
}

async function updateRunningClaim(
  db: DrizzleMarketplaceClient,
  input: {
    dispatchLeaseOwner: string;
    jobId: string;
    storeId: string;
    tenantId: string;
  },
  values: Partial<typeof integrationJobs.$inferInsert>,
): Promise<MarketplaceJob | null> {
  const [row] = await db
    .update(integrationJobs)
    .set({
      ...values,
      dispatchLeaseExpiresAt: null,
      dispatchLeaseOwner: null,
    })
    .where(
      and(
        jobScopeFilter(input),
        eq(integrationJobs.status, "running"),
        eq(integrationJobs.dispatchLeaseOwner, input.dispatchLeaseOwner),
      ),
    )
    .returning();
  return row ? toPublicJob(db, row, input) : null;
}

export async function toPublicJob(
  db: DrizzleMarketplaceClient,
  row: typeof integrationJobs.$inferSelect,
  scope: { storeId: string; tenantId: string },
) {
  const [account] = await db
    .select({ provider: integrationAccounts.provider })
    .from(integrationAccounts)
    .where(
      and(
        eq(integrationAccounts.id, row.accountId),
        eq(integrationAccounts.storeId, scope.storeId),
        eq(integrationAccounts.tenantId, scope.tenantId),
      ),
    )
    .limit(1);
  if (!account) throw new Error(`Marketplace job account not found: ${row.id}`);
  return toJob(row, toProvider(account.provider));
}

export function submittedOwnerFilter(input: {
  jobId: string;
  leaseOwner: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    jobScopeFilter(input),
    eq(integrationJobs.status, "submitted"),
    eq(integrationJobs.reconciliationLeaseOwner, input.leaseOwner),
  );
}

export function jobScopeFilter(input: {
  jobId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(integrationJobs.id, input.jobId),
    eq(integrationJobs.storeId, input.storeId),
    eq(integrationJobs.tenantId, input.tenantId),
  );
}

export function terminalReconciliationValues(checkedAt: Date) {
  return {
    dispatchLeaseExpiresAt: null,
    dispatchLeaseOwner: null,
    providerOperationExpiresAt: null,
    providerOperationTokenCiphertext: null,
    reconciliationLastCheckedAt: checkedAt,
    reconciliationLeaseExpiresAt: null,
    reconciliationLeaseOwner: null,
    reconciliationNextAttemptAt: null,
  };
}

function toProvider(value: string): MarketplaceProvider {
  return value === "mercado_livre" ? value : "olx";
}
