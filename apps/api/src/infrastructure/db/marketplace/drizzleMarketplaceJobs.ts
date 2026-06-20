import { and, eq } from "drizzle-orm";
import {
  integrationAccounts,
  integrationJobs,
  vehicleProviderListings,
} from "@lojaveiculosv2/db";
import type {
  MarketplaceJob,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { createMarketplaceCredentialCodec } from "../../marketplace/marketplaceCredentialCodec.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import { toAccount, toJob } from "./drizzleMarketplaceMappers.js";

export async function markJobRunning(
  db: DrizzleMarketplaceClient,
  input: { jobId: string; storeId: string; tenantId: string },
): Promise<MarketplaceJob> {
  return updateJob(db, input, { status: "running" });
}

export async function findSyncJob(
  db: DrizzleMarketplaceClient,
  input: { jobId: string; storeId: string; tenantId: string },
): Promise<MarketplaceJob | null> {
  const [row] = await db
    .select()
    .from(integrationJobs)
    .where(
      and(
        eq(integrationJobs.id, input.jobId),
        eq(integrationJobs.storeId, input.storeId),
        eq(integrationJobs.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!row) return null;
  const account = await findAccountById(db, row.accountId);
  return toJob(row, account?.provider ?? "olx");
}

export async function markJobFailed(
  db: DrizzleMarketplaceClient,
  input: {
    completedAt: Date;
    errorMessage: string;
    jobId: string;
    metadata?: Record<string, unknown>;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceJob> {
  return updateJob(db, input, {
    completedAt: input.completedAt,
    errorMessage: input.errorMessage,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    status: "failed",
  });
}

export async function markJobCompleted(
  db: DrizzleMarketplaceClient,
  input: {
    completedAt: Date;
    externalId?: string | null;
    jobId: string;
    listingId?: string | null;
    metadata?: Record<string, unknown>;
    provider: MarketplaceProvider;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceJob> {
  const job = await updateJob(db, input, {
    completedAt: input.completedAt,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    status: "succeeded",
  });
  if (input.externalId && input.listingId) {
    await db
      .insert(vehicleProviderListings)
      .values({
        accountId: job.accountId,
        externalId: input.externalId,
        listingId: input.listingId,
        metadata: input.metadata ?? {},
        storeId: input.storeId,
        tenantId: input.tenantId,
      })
      .onConflictDoUpdate({
        set: {
          externalId: input.externalId,
          metadata: input.metadata ?? {},
        },
        target: [
          vehicleProviderListings.accountId,
          vehicleProviderListings.listingId,
        ],
      });
  }
  return job;
}

async function updateJob(
  db: DrizzleMarketplaceClient,
  input: { jobId: string; storeId: string; tenantId: string },
  values: Partial<typeof integrationJobs.$inferInsert>,
): Promise<MarketplaceJob> {
  const [row] = await db
    .update(integrationJobs)
    .set(values)
    .where(
      and(
        eq(integrationJobs.id, input.jobId),
        eq(integrationJobs.storeId, input.storeId),
        eq(integrationJobs.tenantId, input.tenantId),
      ),
    )
    .returning();
  if (!row) throw new Error(`Marketplace job not found: ${input.jobId}`);
  const account = await findAccountById(db, row.accountId);
  return toJob(row, account?.provider ?? "olx");
}

async function findAccountById(
  db: DrizzleMarketplaceClient,
  accountId: string,
) {
  const [row] = await db
    .select()
    .from(integrationAccounts)
    .where(eq(integrationAccounts.id, accountId))
    .limit(1);
  return row
    ? toAccount(
        row,
        createMarketplaceCredentialCodec(process.env).redactAccountConfig,
      )
    : null;
}
