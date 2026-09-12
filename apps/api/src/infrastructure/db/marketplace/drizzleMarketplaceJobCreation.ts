import { and, eq, isNull } from "drizzle-orm";
import { integrationAccounts, integrationJobs } from "@lojaveiculosv2/db";
import type {
  CreateMarketplaceJobInput,
  MarketplaceJob,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import { marketplaceJobIdempotencyKey } from "../../../domains/marketplace/services/MarketplaceService/marketplaceJobIdempotency.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import { toJob } from "./drizzleMarketplaceMappers.js";

export async function createSyncJob(
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
        isNull(integrationAccounts.archivedAt),
      ),
    )
    .limit(1);
  if (!account) throw new MarketplaceAccountMissingError(input.provider);

  const idempotencyKey = marketplaceJobIdempotencyKey(input);
  const [row] = await db
    .insert(integrationJobs)
    .values({
      accountId: account.id,
      idempotencyKey,
      jobType: input.jobType,
      metadata: input.metadata,
      status: "queued",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing()
    .returning();
  if (row) return toJob(row, input.provider);
  if (!idempotencyKey) throw new Error("Marketplace sync job insert failed.");
  const [existing] = await db
    .select()
    .from(integrationJobs)
    .where(
      and(
        eq(integrationJobs.accountId, account.id),
        eq(integrationJobs.idempotencyKey, idempotencyKey),
        eq(integrationJobs.storeId, input.storeId),
        eq(integrationJobs.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Marketplace sync job insert failed.");
  return toJob(existing, input.provider);
}
