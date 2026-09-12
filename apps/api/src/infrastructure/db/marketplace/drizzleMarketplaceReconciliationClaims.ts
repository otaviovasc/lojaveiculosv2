import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { integrationAccounts, integrationJobs } from "@lojaveiculosv2/db";
import type {
  MarketplaceJobScope,
  MarketplaceProvider,
  MarketplaceReconciliationClaim,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { MarketplaceCredentialCodec } from "../../marketplace/marketplaceCredentialCodec.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import { toJob } from "./drizzleMarketplaceMappers.js";

export async function listProcessableJobScopes(
  db: DrizzleMarketplaceClient,
  input: { limit: number; now: Date },
): Promise<MarketplaceJobScope[]> {
  const rows = await db
    .selectDistinct({
      storeId: integrationJobs.storeId,
      tenantId: integrationJobs.tenantId,
    })
    .from(integrationJobs)
    .where(
      or(
        eq(integrationJobs.status, "queued"),
        and(
          eq(integrationJobs.status, "running"),
          lte(integrationJobs.dispatchLeaseExpiresAt, input.now),
        ),
        and(
          eq(integrationJobs.status, "submitted"),
          lte(integrationJobs.reconciliationNextAttemptAt, input.now),
          leaseAvailable(input.now),
        ),
      ),
    )
    .limit(input.limit);
  return rows.map((row) => ({
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  }));
}

export async function listQueuedJobIds(
  db: DrizzleMarketplaceClient,
  input: { limit: number; scope: { storeId: string; tenantId: string } },
): Promise<string[]> {
  const rows = await db
    .select({ id: integrationJobs.id })
    .from(integrationJobs)
    .where(
      and(
        eq(integrationJobs.storeId, input.scope.storeId),
        eq(integrationJobs.tenantId, input.scope.tenantId),
        eq(integrationJobs.status, "queued"),
      ),
    )
    .orderBy(asc(integrationJobs.createdAt))
    .limit(input.limit);
  return rows.map(({ id }) => id);
}

export function claimSubmittedJobs(
  db: DrizzleMarketplaceClient,
  codec: MarketplaceCredentialCodec,
  input: ClaimInput,
): Promise<MarketplaceReconciliationClaim[]> {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleMarketplaceClient;
    const candidates = await client
      .select({ id: integrationJobs.id })
      .from(integrationJobs)
      .where(claimFilter(input))
      .orderBy(
        asc(integrationJobs.reconciliationNextAttemptAt),
        asc(integrationJobs.createdAt),
      )
      .limit(input.limit)
      .for("update", { skipLocked: true });
    if (candidates.length === 0) return [];
    const rows = await client
      .update(integrationJobs)
      .set({
        reconciliationAttemptCount: sql`${integrationJobs.reconciliationAttemptCount} + 1`,
        reconciliationLeaseExpiresAt: input.leaseExpiresAt,
        reconciliationLeaseOwner: input.leaseOwner,
        updatedAt: input.now,
      })
      .where(
        and(
          inArray(
            integrationJobs.id,
            candidates.map(({ id }) => id),
          ),
          claimFilter(input),
        ),
      )
      .returning();
    const providers = await readProviders(client, rows, input);
    return rows.map((row) => {
      const provider = providers.get(row.accountId);
      if (!provider) {
        throw new Error(`Marketplace job account not found: ${row.id}`);
      }
      return {
        attemptCount: row.reconciliationAttemptCount,
        job: toJob(row, provider),
        leaseOwner: input.leaseOwner,
        operationExpiresAt: row.providerOperationExpiresAt,
        operationToken: row.providerOperationTokenCiphertext
          ? codec.decryptSecret(row.providerOperationTokenCiphertext)
          : null,
      };
    });
  });
}

type ClaimInput = {
  force?: boolean;
  jobId?: string;
  leaseExpiresAt: Date;
  leaseOwner: string;
  limit: number;
  now: Date;
  storeId: string;
  tenantId: string;
};

function claimFilter(input: ClaimInput) {
  const forceJob = Boolean(input.force && input.jobId);
  return and(
    eq(integrationJobs.storeId, input.storeId),
    eq(integrationJobs.tenantId, input.tenantId),
    eq(integrationJobs.status, "submitted"),
    ...(input.jobId ? [eq(integrationJobs.id, input.jobId)] : []),
    ...(forceJob
      ? []
      : [lte(integrationJobs.reconciliationNextAttemptAt, input.now)]),
    leaseAvailable(input.now),
  );
}

function leaseAvailable(now: Date) {
  return or(
    isNull(integrationJobs.reconciliationLeaseOwner),
    lte(integrationJobs.reconciliationLeaseExpiresAt, now),
  );
}

async function readProviders(
  db: DrizzleMarketplaceClient,
  rows: (typeof integrationJobs.$inferSelect)[],
  scope: { storeId: string; tenantId: string },
) {
  const accounts = await db
    .select({
      id: integrationAccounts.id,
      provider: integrationAccounts.provider,
    })
    .from(integrationAccounts)
    .where(
      and(
        inArray(
          integrationAccounts.id,
          rows.map(({ accountId }) => accountId),
        ),
        eq(integrationAccounts.storeId, scope.storeId),
        eq(integrationAccounts.tenantId, scope.tenantId),
      ),
    );
  return new Map(accounts.map((row) => [row.id, toProvider(row.provider)]));
}

function toProvider(value: string): MarketplaceProvider {
  if (value === "olx" || value === "mercado_livre") return value;
  throw new Error(`Unsupported marketplace provider: ${value}`);
}
