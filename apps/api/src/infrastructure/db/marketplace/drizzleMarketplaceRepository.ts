import { and, eq, inArray, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  integrationAccounts,
  vehicleProviderListings,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  MarketplaceAccount,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceProviderListing,
  MarketplaceRepository,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import {
  createMarketplaceCredentialCodec,
  type MarketplaceCredentialCodec,
} from "../../marketplace/marketplaceCredentialCodec.js";
import {
  findListingProjection,
  listListingProjections,
} from "./drizzleMarketplaceReads.js";
import { findCatalogMapping } from "./drizzleMarketplaceCatalogMappings.js";
import {
  findSyncJob,
  markJobCompleted,
  markJobFailed,
  markJobRunning,
  markJobSubmitted,
} from "./drizzleMarketplaceJobs.js";
import { recoverStaleRunningJobs } from "./drizzleMarketplaceDispatchRecovery.js";
import { listActiveSyncJobs } from "./drizzleMarketplaceActiveJobs.js";
import {
  claimSubmittedJobs,
  listProcessableJobScopes,
  listQueuedJobIds,
} from "./drizzleMarketplaceReconciliationClaims.js";
import {
  completeSubmittedJob,
  failSubmittedJob,
  rescheduleSubmittedJob,
} from "./drizzleMarketplaceReconciliation.js";
import { toAccount, toRecord } from "./drizzleMarketplaceMappers.js";
import { upsertMarketplaceAccount } from "./drizzleMarketplaceAccounts.js";

export type DrizzleMarketplaceClient = PostgresJsDatabase<typeof schema>;

import { createSyncJob } from "./drizzleMarketplaceJobCreation.js";
import { listOverview } from "./drizzleMarketplaceOverviewRead.js";

export function createDrizzleMarketplaceRepository(
  db: DrizzleMarketplaceClient,
  codec: MarketplaceCredentialCodec = createMarketplaceCredentialCodec(
    process.env,
  ),
): MarketplaceRepository {
  return {
    createSyncJob: (input) => createSyncJob(db, input),
    claimSubmittedJobs: (input) => claimSubmittedJobs(db, codec, input),
    completeSubmittedJob: (input) => completeSubmittedJob(db, input),
    failSubmittedJob: (input) => failSubmittedJob(db, input),
    findAccount: (input) => findAccount(db, input, codec),
    findAccountById: (input) => findAccountById(db, input, codec),
    findCatalogMapping: (input) => findCatalogMapping(db, input),
    findListingProjection: (input) => findListingProjection(db, input),
    findProviderListing: (input) => findProviderListing(db, input),
    findSyncJob: (input) => findSyncJob(db, input),
    listListingProjections: (input) => listListingProjections(db, input),
    listActiveSyncJobs: (input) => listActiveSyncJobs(db, input),
    listProcessableJobScopes: (input) => listProcessableJobScopes(db, input),
    listProviderListings: (input) => listProviderListings(db, input),
    listQueuedJobIds: (input) => listQueuedJobIds(db, input),
    listOverview: (input) => listOverview(db, input),
    markJobCompleted: (input) => markJobCompleted(db, input),
    markJobFailed: (input) => markJobFailed(db, input),
    markJobRunning: (input) => markJobRunning(db, input),
    markJobSubmitted: (input) => markJobSubmitted(db, codec, input),
    recoverStaleRunningJobs: (input) => recoverStaleRunningJobs(db, input),
    rescheduleSubmittedJob: (input) => rescheduleSubmittedJob(db, input),
    upsertAccount: (input) => upsertMarketplaceAccount(db, input, codec),
  };
}

async function findAccountById(
  db: DrizzleMarketplaceClient,
  input: { accountId: string; storeId: string; tenantId: string },
  codec: MarketplaceCredentialCodec,
): Promise<MarketplaceAccount | null> {
  const [row] = await db
    .select()
    .from(integrationAccounts)
    .where(
      and(
        eq(integrationAccounts.id, input.accountId),
        eq(integrationAccounts.storeId, input.storeId),
        eq(integrationAccounts.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row ? toAccount(row, codec.decodeAccountConfig) : null;
}

async function findAccount(
  db: DrizzleMarketplaceClient,
  input: { provider: MarketplaceProvider; storeId: string; tenantId: string },
  codec: MarketplaceCredentialCodec,
): Promise<MarketplaceAccount | null> {
  const [row] = await db
    .select()
    .from(integrationAccounts)
    .where(
      and(
        eq(integrationAccounts.provider, input.provider),
        eq(integrationAccounts.storeId, input.storeId),
        eq(integrationAccounts.tenantId, input.tenantId),
        isNull(integrationAccounts.archivedAt),
      ),
    )
    .limit(1);
  return row ? toAccount(row, codec.decodeAccountConfig) : null;
}

async function findProviderListing(
  db: DrizzleMarketplaceClient,
  input: {
    accountId: string;
    listingId: string;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceProviderListing | null> {
  const [row] = await db
    .select()
    .from(vehicleProviderListings)
    .where(
      and(
        eq(vehicleProviderListings.accountId, input.accountId),
        eq(vehicleProviderListings.listingId, input.listingId),
        eq(vehicleProviderListings.storeId, input.storeId),
        eq(vehicleProviderListings.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row
    ? {
        accountId: row.accountId,
        externalId: row.externalId,
        listingId: row.listingId,
        metadata: toRecord(row.metadata),
        storeId: row.storeId as never,
        tenantId: row.tenantId as never,
      }
    : null;
}

async function listProviderListings(
  db: DrizzleMarketplaceClient,
  input: {
    accountId: string;
    listingIds?: readonly string[];
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceProviderListing[]> {
  const rows = await db
    .select()
    .from(vehicleProviderListings)
    .where(
      and(
        eq(vehicleProviderListings.accountId, input.accountId),
        eq(vehicleProviderListings.storeId, input.storeId),
        eq(vehicleProviderListings.tenantId, input.tenantId),
        ...(input.listingIds?.length
          ? [inArray(vehicleProviderListings.listingId, [...input.listingIds])]
          : []),
      ),
    )
    .limit(500);
  return rows.map((row) => ({
    accountId: row.accountId,
    externalId: row.externalId,
    listingId: row.listingId,
    metadata: toRecord(row.metadata),
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  }));
}
