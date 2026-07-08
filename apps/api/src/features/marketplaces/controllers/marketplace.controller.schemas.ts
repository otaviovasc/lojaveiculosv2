import { z } from "zod";

export const marketplaceProviderSchema = z.enum(["olx", "mercado_livre"]);

export const upsertMarketplaceAccountSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  provider: marketplaceProviderSchema,
  status: z.enum(["active", "error", "inactive"]),
});

export const createMarketplaceSyncJobSchema = z.object({
  jobType: z.enum(["listing_publish", "listing_unpublish", "listing_update"]),
  metadata: z
    .object({
      batchId: z.string().min(1).optional(),
      externalId: z.string().min(1).optional(),
      listingId: z.string().min(1),
      planDecision: z
        .enum(["publish", "update", "unpublish", "no_op", "blocked"])
        .optional(),
      providerRequest: z
        .object({
          attributeIds: z.array(z.string().min(1)).optional(),
          categoryId: z.string().min(1).optional(),
          parameterIds: z.array(z.string().min(1)).optional(),
        })
        .strict()
        .optional(),
      providerResult: z
        .object({
          externalId: z.string().min(1).nullable().optional(),
          providerRequestId: z.string().min(1).nullable().optional(),
          providerStatus: z.string().min(1).nullable().optional(),
        })
        .strict()
        .optional(),
      retryOfJobId: z.string().min(1).optional(),
      stockSync: z.literal(true).optional(),
    })
    .strict(),
  provider: marketplaceProviderSchema,
});

export const marketplaceStockSyncPreviewSchema = z.object({
  listingIds: z.array(z.string().min(1)).optional(),
  provider: marketplaceProviderSchema,
});

export const marketplaceStockSyncRunSchema = z.object({
  batchId: z.string().min(1).optional(),
  listingIds: z.array(z.string().min(1)).optional(),
  provider: marketplaceProviderSchema,
});

export const marketplaceSyncJobRetrySchema = z
  .object({
    reason: z.string().min(1).max(500).optional(),
  })
  .strict();

export const createMarketplaceConnectUrlSchema = z.object({
  provider: marketplaceProviderSchema,
  redirectUri: z.string().url(),
});

export const completeMarketplaceConnectionSchema = z.object({
  code: z.string().min(8),
  provider: marketplaceProviderSchema,
  redirectUri: z.string().url(),
});
