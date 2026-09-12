import type { Context, Hono } from "hono";
import type { InventoryListingServices } from "../../inventory/controllers/listingServices.js";
import type { PublicStorefrontRepository } from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import { VehicleListingNotFoundError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  toExternalVehicleDetail,
  toExternalVehicleListItem,
} from "./externalApiRuntime.dtos.js";
import { externalVehicleQuerySchema } from "./externalApiRuntime.schemas.js";
import {
  createIntegrationContext,
  handleRuntime,
  parseQuery,
  type RuntimeContextFactory,
} from "./externalApiRuntime.http.js";
import {
  createPagination,
  hasAdvancedVehicleFilters,
  matchesVehicleFilters,
  resolveVehicleStatus,
  sortVehicles,
} from "./externalApiRuntime.support.js";

export function registerExternalVehicleRoutes(
  feature: Hono,
  input: {
    contextFactory: RuntimeContextFactory;
    inventory: InventoryListingServices;
    publicStorefront?: PublicStorefrontRepository;
  },
) {
  feature.get("/vehicles/search", (context) =>
    handleRuntime(context, async () =>
      context.json(await listExternalVehicles(context, input)),
    ),
  );
  feature.get("/vehicles", (context) =>
    handleRuntime(context, async () =>
      context.json(await listExternalVehicles(context, input)),
    ),
  );
  feature.get("/vehicles/:listingId", (context) =>
    handleRuntime(context, async () => {
      const serviceContext = await createIntegrationContext(
        context,
        input.contextFactory,
      );
      const listingId = context.req.param("listingId");
      const detail = await input.inventory.getListing(serviceContext, {
        listingId,
      });
      if (!detail.listing.isVisibleOnPublicSite) {
        throw new VehicleListingNotFoundError(listingId);
      }
      const publicListing = input.publicStorefront?.findPublicListingDetailById
        ? await input.publicStorefront.findPublicListingDetailById({
            listingId,
            storeId: serviceContext.storeId as never,
            tenantId: serviceContext.tenantId as never,
          })
        : null;
      if (input.publicStorefront && !publicListing) {
        throw new VehicleListingNotFoundError(listingId);
      }
      return context.json({
        data: toExternalVehicleDetail(
          detail,
          publicListing?.priceCents ?? null,
        ),
      });
    }),
  );
}

async function listExternalVehicles(
  context: Context,
  input: {
    contextFactory: RuntimeContextFactory;
    inventory: InventoryListingServices;
    publicStorefront?: PublicStorefrontRepository;
  },
) {
  const query = parseQuery(context, externalVehicleQuerySchema);
  const serviceContext = await createIntegrationContext(
    context,
    input.contextFactory,
  );
  const limit = query.limit;
  const offset = query.offset ?? (query.page - 1) * limit;
  const listInput = {
    search: query.search ?? query.q ?? null,
    status: resolveVehicleStatus(query),
  };
  const [items, publicPrices] = await Promise.all([
    listAllListingsForLocalFilters(input, serviceContext, listInput),
    loadPublicPrices(input.publicStorefront, serviceContext),
  ]);
  const filtered = sortVehicles(
    items
      .filter((item) => item.listing.isVisibleOnPublicSite)
      .filter((item) => !publicPrices || publicPrices.has(item.listing.id))
      .map((item) =>
        toExternalVehicleListItem(
          item,
          publicPrices?.get(item.listing.id) ?? null,
        ),
      )
      .filter((item) => matchesVehicleFilters(item, query)),
    query.sort,
  );
  return {
    data: filtered.slice(offset, offset + limit),
    meta: {
      contract: "external-api.vehicle-list.v1",
      filtersAppliedInEnvelope: hasAdvancedVehicleFilters(query),
    },
    pagination: createPagination(query.page, limit, offset, filtered.length),
  };
}

async function loadPublicPrices(
  repository: PublicStorefrontRepository | undefined,
  serviceContext: Awaited<ReturnType<typeof createIntegrationContext>>,
) {
  if (!repository) return null;
  const prices = new Map<string, number | null>();
  let offset = 0;

  for (;;) {
    const page = await repository.listPublicListings({
      limit: 100,
      offset,
      storeId: serviceContext.storeId as never,
      tenantId: serviceContext.tenantId as never,
    });
    for (const listing of page) prices.set(listing.id, listing.priceCents);
    if (page.length < 100) return prices;
    offset += page.length;
  }
}

async function listAllListingsForLocalFilters(
  input: {
    inventory: InventoryListingServices;
  },
  serviceContext: Awaited<ReturnType<typeof createIntegrationContext>>,
  listInput: {
    search: string | null;
    status: ReturnType<typeof resolveVehicleStatus>;
  },
) {
  const items: Awaited<
    ReturnType<InventoryListingServices["listListings"]>
  >["items"] = [];
  let offset = 0;

  for (;;) {
    const page = await input.inventory.listListings(serviceContext, {
      ...listInput,
      limit: 100,
      offset,
    });
    items.push(...page.items);

    if (
      !page.hasMore ||
      page.nextOffset === null ||
      page.nextOffset <= offset
    ) {
      return items;
    }

    offset = page.nextOffset;
  }
}
