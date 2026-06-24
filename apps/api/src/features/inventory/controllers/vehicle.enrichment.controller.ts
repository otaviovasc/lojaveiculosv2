import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  inventoryEnrichmentServices,
  type InventoryEnrichmentServices,
} from "./inventoryEnrichmentServices.js";
import { parseJson, handle } from "./vehicle.controller.http.js";
import {
  plateLookupSchema,
  resaleAnalysisSchema,
} from "./vehicle.enrichment.schemas.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryEnrichmentRoutes(
  inventoryFeature: Hono,
  createContext: CreateContext,
  services: InventoryEnrichmentServices = inventoryEnrichmentServices,
) {
  inventoryFeature.post("/enrichment/plate", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, plateLookupSchema);
      const serviceContext = await createContext(context);
      return context.json(await services.lookupPlate(serviceContext, input));
    }),
  );

  inventoryFeature.post("/enrichment/resale-analysis", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, resaleAnalysisSchema);
      const serviceContext = await createContext(context);
      return context.json(await services.analyzeResale(serviceContext, input));
    }),
  );
}
