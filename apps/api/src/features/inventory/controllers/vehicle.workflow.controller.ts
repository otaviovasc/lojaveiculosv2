import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import { handle, parseJson } from "./vehicle.controller.http.js";
import {
  reserveListingSchema,
  sellListingSchema,
} from "./vehicle.controller.schemas.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryWorkflowRoutes(
  app: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  app.post("/listings/:listingId/reserve", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, reserveListingSchema);
      const serviceContext = await createContext(context);

      return context.json(
        await services.reserveListing(serviceContext, {
          ...input,
          buyer: normalizeBuyer(input.buyer),
          listingId: context.req.param("listingId"),
        }),
        201,
      );
    }),
  );

  app.post("/listings/:listingId/sell", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, sellListingSchema);
      const serviceContext = await createContext(context);

      return context.json(
        await services.sellListing(serviceContext, {
          ...input,
          buyer: normalizeBuyer(input.buyer),
          listingId: context.req.param("listingId"),
        }),
        201,
      );
    }),
  );
}

function normalizeBuyer(input: {
  address?: string | null | undefined;
  document?: string | null | undefined;
  email?: string | null | undefined;
  name: string;
  phone?: string | null | undefined;
}) {
  return {
    address: input.address ?? null,
    document: input.document ?? null,
    email: input.email ?? null,
    name: input.name,
    phone: input.phone ?? null,
  };
}
