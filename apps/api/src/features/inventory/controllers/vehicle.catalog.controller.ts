import type { Context, Hono } from "hono";
import type { z } from "zod";
import type { VehicleCatalogType } from "../../../domains/vehicle/ports/vehicleCatalogProvider.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import {
  catalogPriceHistoryQuerySchema,
  catalogQuerySchema,
  catalogSnapshotQuerySchema,
} from "./vehicle.controller.schemas.js";
import { handle, RequestValidationError } from "./vehicle.controller.http.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryCatalogRoutes(
  inventoryFeature: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  inventoryFeature.get("/catalog/brands", async (context) =>
    handle(context, async () => {
      const query = parseQuery(context, catalogQuerySchema);
      const serviceContext = await createContext(context);
      return context.json(
        await services.listCatalogBrands(
          serviceContext,
          cleanCatalogQuery(query),
        ),
      );
    }),
  );

  inventoryFeature.get("/catalog/brands/:brandCode/models", async (context) =>
    handle(context, async () => {
      const query = parseQuery(context, catalogQuerySchema);
      const serviceContext = await createContext(context);
      return context.json(
        await services.listCatalogModels(serviceContext, {
          brandCode: context.req.param("brandCode"),
          ...cleanCatalogQuery(query),
        }),
      );
    }),
  );

  inventoryFeature.get(
    "/catalog/brands/:brandCode/models/:modelFamilyCode/versions",
    async (context) =>
      handle(context, async () => {
        const query = parseQuery(context, catalogQuerySchema);
        const serviceContext = await createContext(context);
        return context.json(
          await services.listCatalogVersions(serviceContext, {
            brandCode: context.req.param("brandCode"),
            modelFamilyCode: context.req.param("modelFamilyCode"),
            ...cleanCatalogQuery(query),
          }),
        );
      }),
  );

  inventoryFeature.get(
    "/catalog/brands/:brandCode/versions/:versionCode/years",
    async (context) =>
      handle(context, async () => {
        const query = parseQuery(context, catalogQuerySchema);
        const serviceContext = await createContext(context);
        return context.json(
          await services.listCatalogYears(serviceContext, {
            brandCode: context.req.param("brandCode"),
            versionCode: context.req.param("versionCode"),
            ...cleanCatalogQuery(query),
          }),
        );
      }),
  );

  inventoryFeature.get("/catalog/snapshot", async (context) =>
    handle(context, async () => {
      const query = parseQuery(context, catalogSnapshotQuerySchema);
      const serviceContext = await createContext(context);
      return context.json(
        await services.getCatalogSnapshot(
          serviceContext,
          cleanCatalogSnapshotQuery(query),
        ),
      );
    }),
  );

  inventoryFeature.get(
    "/catalog/fipe/:fipeCode/years/:yearCode/history",
    async (context) =>
      handle(context, async () => {
        const query = parseQuery(context, catalogPriceHistoryQuerySchema);
        const serviceContext = await createContext(context);
        return context.json(
          await services.getCatalogPriceHistory(serviceContext, {
            fipeCode: context.req.param("fipeCode"),
            yearCode: context.req.param("yearCode"),
            ...cleanCatalogPriceHistoryQuery(query),
          }),
        );
      }),
  );
}

function parseQuery<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  const parsed = schema.safeParse(context.req.query());
  if (!parsed.success)
    throw new RequestValidationError("Request query is invalid.");
  return parsed.data;
}

function cleanCatalogQuery(query: {
  vehicleType?: VehicleCatalogType | undefined;
}) {
  return query.vehicleType ? { vehicleType: query.vehicleType } : {};
}

function cleanCatalogSnapshotQuery(query: {
  brandCode: string;
  modelCode: string;
  vehicleType?: VehicleCatalogType | undefined;
  yearCode: string;
}) {
  return {
    brandCode: query.brandCode,
    modelCode: query.modelCode,
    yearCode: query.yearCode,
    ...cleanCatalogQuery(query),
  };
}

function cleanCatalogPriceHistoryQuery(query: {
  referenceCode?: string | undefined;
  vehicleType?: VehicleCatalogType | undefined;
}) {
  return {
    ...cleanCatalogQuery(query),
    ...(query.referenceCode ? { referenceCode: query.referenceCode } : {}),
  };
}
