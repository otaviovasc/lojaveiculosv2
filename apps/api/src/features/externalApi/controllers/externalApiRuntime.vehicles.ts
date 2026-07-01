import type { Context, Hono } from "hono";
import type { InventoryListingServices } from "../../inventory/controllers/listingServices.js";
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
  createPaginationFromResult,
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
      return context.json({
        data: toExternalVehicleDetail(
          await input.inventory.getListing(serviceContext, {
            listingId: context.req.param("listingId"),
          }),
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
  },
) {
  const query = parseQuery(context, externalVehicleQuerySchema);
  const serviceContext = await createIntegrationContext(
    context,
    input.contextFactory,
  );
  const limit = query.limit;
  const offset = query.offset ?? (query.page - 1) * limit;
  const needsLocalFiltering = hasAdvancedVehicleFilters(query);
  const listInput = {
    search: query.search ?? query.q ?? null,
    status: resolveVehicleStatus(query),
  };
  if (needsLocalFiltering) {
    const items = await listAllListingsForLocalFilters(
      input,
      serviceContext,
      listInput,
    );
    const filtered = sortVehicles(
      items
        .map(toExternalVehicleListItem)
        .filter((item) => matchesVehicleFilters(item, query)),
      query.sort,
    );

    return {
      data: filtered.slice(offset, offset + limit),
      meta: {
        contract: "external-api.vehicle-list.v1",
        filtersAppliedInEnvelope: true,
      },
      pagination: createPagination(query.page, limit, offset, filtered.length),
    };
  }

  const listings = await input.inventory.listListings(serviceContext, {
    ...listInput,
    limit,
    offset,
  });
  const filtered = sortVehicles(
    listings.items
      .map(toExternalVehicleListItem)
      .filter((item) => matchesVehicleFilters(item, query)),
    query.sort,
  );
  return {
    data: filtered,
    meta: {
      contract: "external-api.vehicle-list.v1",
      filtersAppliedInEnvelope: false,
    },
    pagination: createPaginationFromResult(query.page, limit, listings),
  };
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
