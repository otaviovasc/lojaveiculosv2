import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import { handle, parseJson } from "./vehicle.controller.http.js";
import {
  createChecklistSchema,
  updateChecklistSchema,
} from "./vehicle.controller.schemas.js";
import type { VehicleChecklist } from "../../../domains/vehicle/ports/vehicleChecklistRepository.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryChecklistRoutes(
  app: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  app.get("/units/:unitId/checklists", async (context) =>
    handle(context, async () => {
      const serviceContext = await createContext(context);
      const checklists = await services.listChecklists(serviceContext, {
        unitId: context.req.param("unitId"),
      });

      return context.json({ checklists: checklists.map(toChecklistDto) });
    }),
  );

  app.post("/units/:unitId/checklists", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, createChecklistSchema);
      const serviceContext = await createContext(context);

      return context.json(
        await services.createChecklist(serviceContext, {
          ...input,
          unitId: context.req.param("unitId"),
        }),
        201,
      );
    }),
  );

  app.patch("/units/:unitId/checklists/:checklistId", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, updateChecklistSchema);
      const serviceContext = await createContext(context);

      return context.json(
        await services.updateChecklist(serviceContext, {
          ...input,
          checklistId: context.req.param("checklistId"),
          unitId: context.req.param("unitId"),
        }),
      );
    }),
  );
}

function toChecklistDto(checklist: VehicleChecklist) {
  return {
    ...checklist,
    completedAt: checklist.completedAt?.toISOString() ?? null,
    createdAt: checklist.createdAt.toISOString(),
    updatedAt: checklist.updatedAt.toISOString(),
  };
}
