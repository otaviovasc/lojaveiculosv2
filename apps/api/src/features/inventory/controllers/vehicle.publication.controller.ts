import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import { handle, parseJson } from "./vehicle.controller.http.js";
import {
  publishListingSchema,
  unpublishListingSchema,
} from "./vehicle.controller.schemas.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryPublicationRoutes(
  app: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  app.post("/listings/:listingId/publish", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, publishListingSchema);
      const serviceContext = await createContext(context);
      const result = await services.publishListing(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );

  app.post("/listings/:listingId/unpublish", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, unpublishListingSchema);
      const serviceContext = await createContext(context);
      const result = await services.unpublishListing(serviceContext, {
        ...input,
        listingId: context.req.param("listingId"),
      });

      return context.json(result);
    }),
  );
}
