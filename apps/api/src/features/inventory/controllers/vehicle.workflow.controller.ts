import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import { handle, parseJson } from "./vehicle.controller.http.js";
import {
  releaseReservationSchema,
  reserveListingSchema,
  sellListingSchema,
} from "./vehicle.controller.schemas.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryWorkflowRoutes(
  app: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  app.post("/units/:unitId/reserve", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, reserveListingSchema);
      const serviceContext = await createContext(context);

      return context.json(
        await services.reserveListing(serviceContext, {
          ...input,
          buyer: normalizeBuyer(input.buyer),
          unitId: context.req.param("unitId"),
        }),
        201,
      );
    }),
  );

  app.post("/units/:unitId/sell", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, sellListingSchema);
      const serviceContext = await createContext(context);

      return context.json(
        await services.sellListing(serviceContext, {
          ...input,
          buyer: normalizeBuyer(input.buyer),
          unitId: context.req.param("unitId"),
        }),
        201,
      );
    }),
  );

  app.post("/units/:unitId/reservation/release", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, releaseReservationSchema);
      const serviceContext = await createContext(context);

      return context.json(
        await services.releaseReservation(serviceContext, {
          ...input,
          unitId: context.req.param("unitId"),
        }),
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
