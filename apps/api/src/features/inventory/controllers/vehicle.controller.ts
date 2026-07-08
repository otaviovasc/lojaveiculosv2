import { Hono, type Context } from "hono";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  inventoryListingServices,
  type InventoryListingServices,
} from "./listingServices.js";
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
import { registerInventoryAcquisitionRoutes } from "./vehicle.acquisition.controller.js";
import { registerInventoryUnitRoutes } from "./vehicle.unit.controller.js";
import { registerInventoryPublicationRoutes } from "./vehicle.publication.controller.js";
import {
  createProtectedServiceContext,
  normalizeFeatureOptions,
  type CreateInventoryFeatureOptions,
} from "./vehicle.controller.options.js";
import { registerInventoryAiStudioRoutes } from "./vehicle.aiStudio.controller.js";

export type { InventoryListingServices } from "./listingServices.js";
export type {
  CreateInventoryFeatureOptions,
  InventoryContextFactory,
} from "./vehicle.controller.options.js";

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

  inventoryFeature.get("/listings/:listingId/audit-events", async (context) =>
    handle(context, async () => {
      const serviceContext = await createContext(context);
      const events = await services.listListingAuditEvents(serviceContext, {
        listingId: context.req.param("listingId"),
      });
      return context.json({
        events: events.map((event) => ({
          ...event,
          occurredAt: event.occurredAt.toISOString(),
        })),
      });
    }),
  );

  inventoryFeature.post(
    "/listings/:listingId/resale-analysis",
    async (context) =>
      handle(context, async () => {
        const serviceContext = await createContext(context);
        return context.json(
          await services.analyzeListingResale(serviceContext, {
            listingId: context.req.param("listingId"),
          }),
        );
      }),
  );

  inventoryFeature.delete("/listings/:listingId", async (context) =>
    handle(context, async () => {
      const serviceContext = await createContext(context);
      await services.deleteListing(serviceContext, {
        listingId: context.req.param("listingId"),
      });

      return context.body(null, 204);
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

  inventoryFeature.post("/units/:unitId/costs", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, costSchema);
      const serviceContext = await createContext(context);
      const result = await services.addVehicleCost(serviceContext, {
        ...input,
        unitId: context.req.param("unitId"),
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

  inventoryFeature.patch("/units/:unitId", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, updateUnitSchema);
      const serviceContext = await createContext(context);
      const result = await services.updateListingUnit(
        serviceContext,
        cleanUpdateUnitRequest(context.req.param("unitId"), input),
      );

      return context.json(result);
    }),
  );

  registerInventoryMediaRoutes(inventoryFeature, services, createContext);
  registerInventoryAiStudioRoutes(inventoryFeature, services, createContext);
  registerInventoryUnitRoutes(inventoryFeature, services, createContext);
  registerInventoryCatalogRoutes(inventoryFeature, services, createContext);
  registerInventoryChecklistRoutes(inventoryFeature, services, createContext);
  registerInventoryAcquisitionRoutes(inventoryFeature, services, createContext);
  registerInventoryPublicationRoutes(inventoryFeature, services, createContext);
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
