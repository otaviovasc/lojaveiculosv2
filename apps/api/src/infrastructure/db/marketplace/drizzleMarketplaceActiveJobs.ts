import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { integrationAccounts, integrationJobs } from "@lojaveiculosv2/db";
import type {
  MarketplaceJob,
  MarketplaceProvider,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";
import { toJob } from "./drizzleMarketplaceMappers.js";

export async function listActiveSyncJobs(
  db: DrizzleMarketplaceClient,
  input: {
    listingIds?: readonly string[];
    provider: MarketplaceProvider;
    storeId: string;
    tenantId: string;
  },
): Promise<MarketplaceJob[]> {
  const rows = await db
    .select({ job: integrationJobs })
    .from(integrationJobs)
    .innerJoin(
      integrationAccounts,
      and(
        eq(integrationAccounts.id, integrationJobs.accountId),
        eq(integrationAccounts.storeId, integrationJobs.storeId),
        eq(integrationAccounts.tenantId, integrationJobs.tenantId),
      ),
    )
    .where(
      and(
        eq(integrationJobs.storeId, input.storeId),
        eq(integrationJobs.tenantId, input.tenantId),
        eq(integrationAccounts.provider, input.provider),
        inArray(integrationJobs.status, ["queued", "running", "submitted"]),
        ...(input.listingIds?.length
          ? [
              inArray(sql<string>`${integrationJobs.metadata}->>'listingId'`, [
                ...input.listingIds,
              ]),
            ]
          : []),
      ),
    )
    .orderBy(desc(integrationJobs.createdAt));
  return rows.map(({ job }) => toJob(job, input.provider));
}
