import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import { handle, parseJson } from "./vehicle.controller.http.js";
import {
  aiStudioApprovalSchema,
  aiStudioGenerationSchema,
} from "./vehicle.controller.schemas.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryAiStudioRoutes(
  inventoryFeature: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  inventoryFeature.post(
    "/units/:unitId/ai-studio/generations",
    async (context) =>
      handle(context, async () => {
        const input = await parseJson(context, aiStudioGenerationSchema);
        const serviceContext = await createContext(context);
        const result = await services.generateAiStudioImage(serviceContext, {
          ...input,
          unitId: context.req.param("unitId"),
        });

        return context.json(result, 201);
      }),
  );

  inventoryFeature.post("/units/:unitId/ai-studio/approvals", async (context) =>
    handle(context, async () => {
      const input = await parseJson(context, aiStudioApprovalSchema);
      const serviceContext = await createContext(context);
      const result = await services.approveAiStudioImage(serviceContext, {
        ...input,
        unitId: context.req.param("unitId"),
      });

      return context.json(result, 201);
    }),
  );
}
