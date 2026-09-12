import { and, eq } from "drizzle-orm";
import { vehicleProviderListings } from "@lojaveiculosv2/db";
import type { MarketplaceJob } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";

export async function applyProviderListingTransition(
  db: DrizzleMarketplaceClient,
  job: MarketplaceJob,
  input: {
    externalId: string | null;
    listingId: string | null;
    metadata: Record<string, unknown>;
    storeId: string;
    tenantId: string;
  },
) {
  if (!input.listingId) return;
  const scope = and(
    eq(vehicleProviderListings.accountId, job.accountId),
    eq(vehicleProviderListings.listingId, input.listingId),
    eq(vehicleProviderListings.storeId, input.storeId),
    eq(vehicleProviderListings.tenantId, input.tenantId),
  );
  if (job.jobType === "listing_unpublish") {
    await db.delete(vehicleProviderListings).where(scope);
    return;
  }
  if (!["listing_publish", "listing_update"].includes(job.jobType)) return;
  if (!input.externalId) {
    throw new Error(
      "Marketplace provider listing acceptance requires an external id.",
    );
  }
  await db
    .insert(vehicleProviderListings)
    .values({
      accountId: job.accountId,
      externalId: input.externalId,
      listingId: input.listingId,
      metadata: input.metadata,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: { externalId: input.externalId, metadata: input.metadata },
      target: [
        vehicleProviderListings.accountId,
        vehicleProviderListings.listingId,
      ],
    });
}
