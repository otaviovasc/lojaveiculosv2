import type { AuditSink } from "@lojaveiculosv2/audit";
import { Hono } from "hono";
import { z } from "zod";
import { getPublicStorefrontCustomPage } from "../../../domains/storefront/services/StorefrontService/getPublicStorefrontCustomPage.js";
import { getPublicStorefrontSite } from "../../../domains/storefront/services/StorefrontService/getPublicStorefrontSite.js";
import { getPublicVehicleListing } from "../../../domains/storefront/services/StorefrontService/getPublicVehicleListing.js";
import { listPublicVehicleListings } from "../../../domains/storefront/services/StorefrontService/listPublicVehicleListings.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type {
  PublicStorefrontRepository,
  PublicVehicleListing,
  PublicVehicleListingDetail,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type { StorefrontPageRepository } from "../../../domains/storefront/ports/storefrontPageRepository.js";
import { createPlaceholderServiceContext } from "../../../infrastructure/http/createPlaceholderServiceContext.js";
import { resolveStoreSlugFromRequest } from "../../../infrastructure/http/storeScope.js";
import { createMemoryCrmRepository } from "../../crm/adapters/memory/crmRepository.js";
import { createMemoryPublicStorefrontRepository } from "../adapters/memory/publicStorefrontRepository.js";
import { createMemoryStorefrontPageRepository } from "../adapters/memory/storefrontPageRepository.js";
import {
  createMemoryPublicLeadRateLimiter,
  type PublicLeadRateLimiter,
} from "../adapters/rateLimiter/publicLeadRateLimiter.js";
import {
  handleStorefront,
  rejectInvalidStorefrontQuery,
  rejectMissingStoreSlug,
} from "./storefront.controller.errors.js";
import {
  handleCreatePublicStorefrontLead,
  handleCreatePublicStorefrontPageLead,
} from "./storefrontLeadHandler.js";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export type CreateStorefrontFeatureOptions = {
  audit?: AuditSink;
  crmRepository?: CrmRepository;
  leadRateLimiter?: PublicLeadRateLimiter;
  pageRepository?: StorefrontPageRepository;
  repository?: PublicStorefrontRepository;
};

export function createStorefrontFeature(
  options: CreateStorefrontFeatureOptions = {},
) {
  const storefrontFeature = new Hono();
  const repository =
    options.repository ?? createMemoryPublicStorefrontRepository();
  const pageRepository =
    options.pageRepository ?? createMemoryStorefrontPageRepository();
  const crmRepository = options.crmRepository ?? createMemoryCrmRepository();
  const leadRateLimiter =
    options.leadRateLimiter ?? createMemoryPublicLeadRateLimiter();

  storefrontFeature.get("/settings", async (context) =>
    handleStorefront(context, async () => {
      const storeSlug = resolveStoreSlugFromRequest(context);

      if (!storeSlug) return rejectMissingStoreSlug(context);

      const serviceContext = createPlaceholderServiceContext(
        context,
        options.audit ? { audit: options.audit } : {},
      );
      const result = await getPublicStorefrontSite(
        serviceContext,
        { storeSlug },
        repository,
      );

      return context.json(result);
    }),
  );

  storefrontFeature.get("/listings", async (context) =>
    handleStorefront(context, async () => {
      const storeSlug = resolveStoreSlugFromRequest(context);
      const query = querySchema.safeParse(context.req.query());

      if (!storeSlug) return rejectMissingStoreSlug(context);

      if (!query.success) {
        return rejectInvalidStorefrontQuery(context, query.error);
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

      return context.json({
        listings: result.listings.map(toPublicVehicleListingDto),
        store: result.store,
      });
    }),
  );

  storefrontFeature.get("/pages/:pageSlug", async (context) =>
    handleStorefront(context, async () => {
      const storeSlug = resolveStoreSlugFromRequest(context);
      const pageSlug = context.req.param("pageSlug");
      const token = context.req.query("token") ?? null;

      if (!storeSlug) return rejectMissingStoreSlug(context);

      const serviceContext = createPlaceholderServiceContext(
        context,
        options.audit ? { audit: options.audit } : {},
      );
      const result = await getPublicStorefrontCustomPage(
        serviceContext,
        { pageSlug, storeSlug, token },
        pageRepository,
      );

      return context.json(toPublicCustomPageDto(result));
    }),
  );

  storefrontFeature.post("/pages/:pageSlug/leads", async (context) =>
    handleStorefront(context, () =>
      handleCreatePublicStorefrontPageLead(context, {
        crmRepository,
        leadRateLimiter,
        pageRepository,
        ...(options.audit ? { audit: options.audit } : {}),
      }),
    ),
  );

  storefrontFeature.post("/listings/:listingSlug/leads", async (context) =>
    handleStorefront(context, () =>
      handleCreatePublicStorefrontLead(context, {
        crmRepository,
        leadRateLimiter,
        repository,
        ...(options.audit ? { audit: options.audit } : {}),
      }),
    ),
  );

  storefrontFeature.get("/listings/:listingSlug", async (context) =>
    handleStorefront(context, async () => {
      const storeSlug = resolveStoreSlugFromRequest(context);
      const listingSlug = context.req.param("listingSlug");

      if (!storeSlug) return rejectMissingStoreSlug(context);

      const serviceContext = createPlaceholderServiceContext(
        context,
        options.audit ? { audit: options.audit } : {},
      );
      const result = await getPublicVehicleListing(
        serviceContext,
        { listingSlug, storeSlug },
        repository,
      );

      return context.json({
        listing: toPublicVehicleListingDetailDto(result.listing),
        store: result.store,
      });
    }),
  );

  return storefrontFeature;
}

export const storefrontFeature = createStorefrontFeature();

function toPublicVehicleListingDto(listing: PublicVehicleListing) {
  const { id: _id, ...dto } = listing;
  return dto;
}

function toPublicVehicleListingDetailDto(listing: PublicVehicleListingDetail) {
  const { id: _id, ...dto } = listing;
  return dto;
}

function toPublicCustomPageDto(
  snapshot: Awaited<ReturnType<typeof getPublicStorefrontCustomPage>>,
) {
  const { secretToken: _secretToken, ...page } = snapshot.page;
  return { ...snapshot, page };
}
