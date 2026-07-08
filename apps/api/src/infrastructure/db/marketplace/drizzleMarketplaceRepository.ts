import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  integrationAccounts,
  integrationJobs,
  vehicleProviderListings,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CreateMarketplaceJobInput,
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceProviderListing,
  MarketplaceRepository,
  UpsertMarketplaceAccountInput,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "../../../domains/marketplace/ports/marketplaceRepository.js";
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
} from "./drizzleMarketplaceJobs.js";
import { toAccount, toJob, toRecord } from "./drizzleMarketplaceMappers.js";
import { buildProviderStates } from "./drizzleMarketplaceOverview.js";

export type DrizzleMarketplaceClient = PostgresJsDatabase<typeof schema>;

const providers = ["olx", "mercado_livre"] satisfies MarketplaceProvider[];

export function createDrizzleMarketplaceRepository(
  db: DrizzleMarketplaceClient,
  codec: MarketplaceCredentialCodec = createMarketplaceCredentialCodec(
    process.env,
  ),
): MarketplaceRepository {
  return {
    createSyncJob: (input) => createSyncJob(db, input),
    findAccount: (input) => findAccount(db, input, codec),
    findCatalogMapping: (input) => findCatalogMapping(db, input),
    findListingProjection: (input) => findListingProjection(db, input),
    findProviderListing: (input) => findProviderListing(db, input),
    findSyncJob: (input) => findSyncJob(db, input),
    listListingProjections: (input) => listListingProjections(db, input),
    listOverview: (input) => listOverview(db, input),
    markJobCompleted: (input) => markJobCompleted(db, input),
    markJobFailed: (input) => markJobFailed(db, input),
    markJobRunning: (input) => markJobRunning(db, input),
    upsertAccount: (input) => upsertAccount(db, input, codec),
  };
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

async function listOverview(
  db: DrizzleMarketplaceClient,
  input: { storeId: string; tenantId: string },
): Promise<MarketplaceOverview> {
  const [accountRows, jobRows] = await Promise.all([
    db
      .select()
      .from(integrationAccounts)
      .where(
        and(
          eq(integrationAccounts.storeId, input.storeId),
          eq(integrationAccounts.tenantId, input.tenantId),
        ),
      )
      .limit(50),
    db
      .select()
      .from(integrationJobs)
      .where(
        and(
          eq(integrationJobs.storeId, input.storeId),
          eq(integrationJobs.tenantId, input.tenantId),
        ),
      )
      .orderBy(desc(integrationJobs.createdAt))
      .limit(50),
  ]);
  const codec = createMarketplaceCredentialCodec(process.env);
  const accounts = accountRows.map((row) =>
    toAccount(row, codec.redactAccountConfig),
  );

  const jobs = jobRows.map((row) => {
    const account = accounts.find((item) => item.id === row.accountId);
    return toJob(row, account?.provider ?? "olx");
  });

  return {
    accounts,
    jobs,
    providerStates: buildProviderStates({ accounts, jobs, providers }),
    providers,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  };
}

async function upsertAccount(
  db: DrizzleMarketplaceClient,
  input: UpsertMarketplaceAccountInput,
  codec: MarketplaceCredentialCodec,
): Promise<MarketplaceAccount> {
  const [row] = await db
    .insert(integrationAccounts)
    .values({
      config: codec.encodeAccountConfig(input.config),
      provider: input.provider,
      status: input.status,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: {
        config: codec.encodeAccountConfig(input.config),
        status: input.status,
      },
      target: [integrationAccounts.storeId, integrationAccounts.provider],
    })
    .returning();
  if (!row) throw new Error("Marketplace account upsert failed.");
  return toAccount(row, codec.redactAccountConfig);
}

async function createSyncJob(
  db: DrizzleMarketplaceClient,
  input: CreateMarketplaceJobInput,
): Promise<MarketplaceJob> {
  const [account] = await db
    .select()
    .from(integrationAccounts)
    .where(
      and(
        eq(integrationAccounts.provider, input.provider),
        eq(integrationAccounts.storeId, input.storeId),
        eq(integrationAccounts.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!account) throw new MarketplaceAccountMissingError(input.provider);

  const [row] = await db
    .insert(integrationJobs)
    .values({
      accountId: account.id,
      jobType: input.jobType,
      metadata: input.metadata,
      status: "queued",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!row) throw new Error("Marketplace sync job insert failed.");
  return toJob(row, input.provider);
}
