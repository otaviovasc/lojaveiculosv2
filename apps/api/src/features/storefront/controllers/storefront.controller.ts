import type { AuditSink } from "@lojaveiculosv2/audit";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import { getPublicVehicleListing } from "../../../domains/storefront/services/StorefrontService/getPublicVehicleListing.js";
import { listPublicVehicleListings } from "../../../domains/storefront/services/StorefrontService/listPublicVehicleListings.js";
import {
  PublicStorefrontListingNotFoundError,
  PublicStorefrontNotFoundError,
  PublicStorefrontRepositoryError,
} from "../../../domains/storefront/services/StorefrontService/serviceSupport.js";
import type { PublicStorefrontRepository } from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import { createPlaceholderServiceContext } from "../../../infrastructure/http/createPlaceholderServiceContext.js";
import { resolveStoreSlugFromRequest } from "../../../infrastructure/http/storeScope.js";
import { createMemoryPublicStorefrontRepository } from "./memoryPublicStorefrontRepository.js";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export type CreateStorefrontFeatureOptions = {
  audit?: AuditSink;
  repository?: PublicStorefrontRepository;
};

export function createStorefrontFeature(
  options: CreateStorefrontFeatureOptions = {},
) {
  const storefrontFeature = new Hono();
  const repository =
    options.repository ?? createMemoryPublicStorefrontRepository();

  storefrontFeature.get("/listings", async (context) =>
    handle(context, async () => {
      const storeSlug = resolveStoreSlugFromRequest(context);
      const query = querySchema.safeParse(context.req.query());

      if (!storeSlug) {
        return context.json({ message: "Store subdomain is required." }, 400);
      }

      if (!query.success) {
        return context.json({ message: "Query parameters are invalid." }, 400);
      }

      const serviceContext = createPlaceholderServiceContext(
        context,
        options.audit ? { audit: options.audit } : {},
      );
      const result = await listPublicVehicleListings(
        serviceContext,
        { limit: query.data.limit, storeSlug },
        repository,
      );

      return context.json(result);
    }),
  );

  storefrontFeature.get("/listings/:listingSlug", async (context) =>
    handle(context, async () => {
      const storeSlug = resolveStoreSlugFromRequest(context);
      const listingSlug = context.req.param("listingSlug");

      if (!storeSlug) {
        return context.json({ message: "Store subdomain is required." }, 400);
      }

      const serviceContext = createPlaceholderServiceContext(
        context,
        options.audit ? { audit: options.audit } : {},
      );
      const result = await getPublicVehicleListing(
        serviceContext,
        { listingSlug, storeSlug },
        repository,
      );

      return context.json(result);
    }),
  );

  return storefrontFeature;
}

export const storefrontFeature = createStorefrontFeature();

async function handle(
  context: Context,
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return context.json({ message: error.message }, 403);
    }

    if (error instanceof PublicStorefrontNotFoundError) {
      return context.json({ message: error.message }, 404);
    }

    if (error instanceof PublicStorefrontListingNotFoundError) {
      return context.json({ message: error.message }, 404);
    }

    if (error instanceof PublicStorefrontRepositoryError) {
      return context.json({ message: error.message }, 500);
    }

    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}
