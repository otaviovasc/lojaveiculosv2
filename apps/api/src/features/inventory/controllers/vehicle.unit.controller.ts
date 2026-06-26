import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import { handle, RequestValidationError } from "./vehicle.controller.http.js";
import { listUnitsQuerySchema } from "./vehicle.controller.schemas.js";

type InventoryContextFactory = (context: Context) => Promise<ServiceContext>;

export function registerInventoryUnitRoutes(
  inventoryFeature: Hono,
  services: InventoryListingServices,
  createContext: InventoryContextFactory,
) {
  inventoryFeature.get("/units", async (context) =>
    handle(context, async () => {
      const parsed = listUnitsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new RequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const input: Parameters<InventoryListingServices["listUnits"]>[1] = {};
      if (parsed.data.limit !== undefined) input.limit = parsed.data.limit;
      if (parsed.data.offset !== undefined) input.offset = parsed.data.offset;
      if (parsed.data.search !== undefined) input.search = parsed.data.search;
      if (parsed.data.status !== undefined) input.status = parsed.data.status;
      const result = await services.listUnits(serviceContext, input);

      return context.json(result);
    }),
  );
}
