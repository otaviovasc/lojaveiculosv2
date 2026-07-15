import type { Context } from "hono";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryEnrichmentServices } from "./inventoryEnrichmentServices.js";
import type { InventoryListingServices } from "./listingServices.js";

export type InventoryContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateInventoryFeatureOptions = {
  contextFactory?: InventoryContextFactory;
  enrichmentServices?: InventoryEnrichmentServices;
  services?: InventoryListingServices;
};

export function normalizeFeatureOptions(
  input: CreateInventoryFeatureOptions | InventoryListingServices,
): CreateInventoryFeatureOptions {
  if ("createListing" in input) return { services: input };
  return input;
}

export async function createProtectedServiceContext(
  context: Context,
  contextFactory: InventoryContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);

  if (!["integration", "user"].includes(serviceContext.actor.kind)) {
    throw new HttpContextAuthenticationError(
      "Inventory routes require authenticated user or integration context.",
    );
  }

  return serviceContext;
}
