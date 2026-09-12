import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import {
  costSchema,
  updateCostSchema,
  voidCostSchema,
} from "./vehicle.cost.schemas.js";
import { handle, parseJson } from "./vehicle.controller.http.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryCostRoutes(
  app: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  app.post("/units/:unitId/costs", async (context) =>
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

  app.patch("/units/:unitId/costs/:costId", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, updateCostSchema);
      const serviceContext = await createContext(context);
      const result = await services.updateVehicleCost(serviceContext, {
        ...input,
        costId: context.req.param("costId"),
        unitId: context.req.param("unitId"),
      });
      return context.json(result);
    }),
  );

  app.post("/units/:unitId/costs/:costId/void", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, voidCostSchema);
      const serviceContext = await createContext(context);
      const result = await services.voidVehicleCost(serviceContext, {
        ...input,
        costId: context.req.param("costId"),
        unitId: context.req.param("unitId"),
      });
      return context.json(result);
    }),
  );
}
