import { Hono, type Context } from "hono";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  inventoryListingServices,
  type InventoryListingServices,
} from "./listingServices.js";
import type { InventoryEnrichmentServices } from "./inventoryEnrichmentServices.js";
import {
  handle,
  parseJson,
  RequestValidationError,
} from "./vehicle.controller.http.js";
import {
  attachUnitSchema,
  costSchema,
  createListingSchema,
  descriptionSchema,
  listListingsQuerySchema,
  priceSchema,
  statusSchema,
  updateListingDetailsSchema,
  updateUnitSchema,
} from "./vehicle.controller.schemas.js";
import {
  cleanListListingsQuery,
  cleanUpdateListingRequest,
  cleanUpdateUnitRequest,
} from "./vehicle.controller.cleaners.js";
import { registerInventoryMediaRoutes } from "./vehicle.media.controller.js";
import { registerInventoryCatalogRoutes } from "./vehicle.catalog.controller.js";
import { registerInventoryChecklistRoutes } from "./vehicle.checklist.controller.js";
import { registerInventoryWorkflowRoutes } from "./vehicle.workflow.controller.js";
import { registerInventoryEnrichmentRoutes } from "./vehicle.enrichment.controller.js";

export type { InventoryListingServices } from "./listingServices.js";

export type InventoryContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateInventoryFeatureOptions = {
  contextFactory?: InventoryContextFactory;
  enrichmentServices?: InventoryEnrichmentServices;
  services?: InventoryListingServices;
};

export function createInventoryFeature(
  input: CreateInventoryFeatureOptions | InventoryListingServices = {},
) {
  const inventoryFeature = new Hono();
  const options = normalizeFeatureOptions(input);
  const services = options.services ?? inventoryListingServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  inventoryFeature.post("/listings", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, createListingSchema);
      const serviceContext = await createContext(context);
      const result = await services.createListing(serviceContext, input);

      return context.json(result, 201);
    }),
  );

  inventoryFeature.get("/listings", async (context) =>
    handle(context, async () => {
      const parsed = listListingsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new RequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const result = await services.listListings(
        serviceContext,
        cleanListListingsQuery({
          limit: parsed.data.limit,
          offset: parsed.data.offset,
          search: parsed.data.search,
          status: parsed.data.status,
        }),
      );

      return context.json(result);
    }),
  );

  inventoryFeature.get("/listings/:listingId", async (context) =>
    handle(context, async () => {
      const serviceContext = await createContext(context);
      const result = await services.getListing(serviceContext, {
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.patch("/listings/:listingId", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, updateListingDetailsSchema);
      const serviceContext = await createContext(context);
      const result = await services.updateListingDetails(
        serviceContext,
        cleanUpdateListingRequest(context.req.param("listingId"), input),
      );

      return context.json(result);
    }),
  );

  inventoryFeature.patch("/listings/:listingId/description", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, descriptionSchema);
      const serviceContext = await createContext(context);
      const result = await services.updateListingDescription(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.patch("/listings/:listingId/price", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, priceSchema);
      const serviceContext = await createContext(context);
      const result = await services.updateListingPrice(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.post("/listings/:listingId/costs", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, costSchema);
      const serviceContext = await createContext(context);
      const result = await services.addVehicleCost(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result, 201);
    }),
  );

  inventoryFeature.put("/listings/:listingId/unit", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, attachUnitSchema);
      const serviceContext = await createContext(context);
      const result = await services.attachListingUnit(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  inventoryFeature.patch(
    "/listings/:listingId/units/:unitId",
    async (context) =>
      handle(context, async () => {
        const input = await parseJson(context, updateUnitSchema);
        const serviceContext = await createContext(context);
        const result = await services.updateListingUnit(
          serviceContext,
          cleanUpdateUnitRequest(
            context.req.param("listingId"),
            context.req.param("unitId"),
            input,
          ),
        );

        return context.json(result);
      }),
  );

  registerInventoryMediaRoutes(inventoryFeature, services, createContext);
  registerInventoryCatalogRoutes(inventoryFeature, services, createContext);
  registerInventoryChecklistRoutes(inventoryFeature, services, createContext);
  registerInventoryWorkflowRoutes(inventoryFeature, services, createContext);
  registerInventoryEnrichmentRoutes(
    inventoryFeature,
    createContext,
    options.enrichmentServices,
  );

  inventoryFeature.patch("/listings/:listingId/status", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, statusSchema);
      const serviceContext = await createContext(context);
      const result = await services.changeListingStatus(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  return inventoryFeature;
}

export const vehicleFeature = createInventoryFeature();

function normalizeFeatureOptions(
  input: CreateInventoryFeatureOptions | InventoryListingServices,
): CreateInventoryFeatureOptions {
  if ("createListing" in input) return { services: input };
  return input;
}

async function createProtectedServiceContext(
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
