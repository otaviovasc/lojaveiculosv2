import { z } from "zod";
import { MarketplaceRequestValidationError } from "./marketplaceErrorResponses.js";

export const marketplaceProviderSchema = z.enum(["olx", "mercado_livre"]);

export const upsertMarketplaceAccountSchema = z
  .object({
    provider: marketplaceProviderSchema,
    status: z.enum(["active", "inactive"]),
  })
  .strict();

export const createMarketplaceSyncJobSchema = z
  .object({
    jobType: z.enum(["listing_publish", "listing_unpublish", "listing_update"]),
    metadata: z
      .object({
        batchId: z.string().uuid().optional(),
        commandId: z.string().uuid(),
        listingId: z.string().min(1),
        planDecision: z
          .enum(["publish", "update", "unpublish", "no_op", "blocked"])
          .optional(),
        retryOfJobId: z.string().min(1).optional(),
        stockSync: z.literal(true).optional(),
      })
      .strict(),
    provider: marketplaceProviderSchema,
  })
  .strict();

export const marketplaceStockSyncPreviewSchema = z.object({
  listingIds: z.array(z.string().min(1)).optional(),
  provider: marketplaceProviderSchema,
});

export const marketplaceStockSyncRunSchema = z.object({
  batchId: z.string().uuid().optional(),
  listingIds: z.array(z.string().min(1)).optional(),
  provider: marketplaceProviderSchema,
});

export const marketplaceSyncJobRetrySchema = z
  .object({
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

export const createMarketplaceConnectUrlSchema = z
  .object({ provider: marketplaceProviderSchema })
  .strict();

export const completeMarketplaceConnectionSchema = z
  .object({ transactionId: z.string().uuid() })
  .strict();

export function ensureMarketplaceProviderMatch(
  routeProvider: string,
  bodyProvider: string,
) {
  if (routeProvider !== bodyProvider) {
    throw new MarketplaceRequestValidationError("Provider route mismatch.", {
      bodyProvider,
      routeProvider,
    });
  }
}

export const marketplaceOAuthCallbackQuerySchema = z.union([
  z.object({ code: z.string().min(8), state: z.string().min(32) }).strict(),
  z
    .object({ error: z.string().min(1).max(120), state: z.string().min(32) })
    .strict(),
]);
