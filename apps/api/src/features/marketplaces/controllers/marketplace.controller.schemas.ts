import { z } from "zod";

export const marketplaceProviderSchema = z.enum(["olx", "mercado_livre"]);

export const upsertMarketplaceAccountSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  provider: marketplaceProviderSchema,
  status: z.enum(["active", "error", "inactive"]),
});

export const createMarketplaceSyncJobSchema = z.object({
  jobType: z.enum([
    "inventory_sync",
    "lead_sync",
    "listing_publish",
    "listing_unpublish",
    "listing_update",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  provider: marketplaceProviderSchema,
});

export const createMarketplaceConnectUrlSchema = z.object({
  provider: marketplaceProviderSchema,
  redirectUri: z.string().url(),
});

export const completeMarketplaceConnectionSchema = z.object({
  code: z.string().min(8),
  provider: marketplaceProviderSchema,
  redirectUri: z.string().url(),
});
