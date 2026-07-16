import type { Context, Hono } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingServices } from "./listingServices.js";
import {
  handle,
  parseJson,
  RequestValidationError,
} from "./vehicle.controller.http.js";
import {
  createChecklistSchema,
  updateChecklistSchema,
} from "./vehicle.controller.schemas.js";
import type { VehicleChecklist } from "../../../domains/vehicle/ports/vehicleChecklistRepository.js";
import {
  vehicleChecklistOverviewScopes,
  vehicleChecklistOverviewStatuses,
  type VehicleChecklistOverview,
} from "../../../domains/vehicle/readModels/vehicleChecklistOverview.js";

type CreateContext = (context: Context) => Promise<ServiceContext>;

export function registerInventoryChecklistRoutes(
  app: Hono,
  services: InventoryListingServices,
  createContext: CreateContext,
) {
  app.get("/checklists/overview", async (context) =>
    handle(context, async () => {
      const input = parseOverviewQuery(context);
      const serviceContext = await createContext(context);
      const overview = await services.listChecklistOverview(
        serviceContext,
        input,
      );
      return context.json(toOverviewDto(overview));
    }),
  );

  app.get("/checklists/report.pdf", async (context) =>
    handle(context, async () => {
      const input = parseOverviewQuery(context);
      const serviceContext = await createContext(context);
      const report = await services.exportChecklistReport(
        serviceContext,
        input,
      );
      const body = Uint8Array.from(report.bytes).buffer;
      return new Response(body, {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "Content-Disposition": `attachment; filename="${report.fileName}"`,
          "Content-Length": String(report.bytes.byteLength),
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Content-Type": "application/pdf",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }),
  );

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

const overviewQuerySchema = z.object({
  scope: z.enum(vehicleChecklistOverviewScopes).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.enum(vehicleChecklistOverviewStatuses).optional(),
  unitId: z.string().trim().min(1).max(200).optional(),
});

function parseOverviewQuery(context: Context) {
  const parsed = overviewQuerySchema.safeParse(context.req.query());
  if (!parsed.success) {
    throw new RequestValidationError("Request query is invalid.");
  }
  return parsed.data;
}

function toOverviewDto(overview: VehicleChecklistOverview) {
  return {
    ...overview,
    generatedAt: overview.generatedAt.toISOString(),
    items: overview.items.map((item) => ({
      ...item,
      checklists: item.checklists.map(toChecklistDto),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

function toChecklistDto(checklist: VehicleChecklist) {
  return {
    ...checklist,
    completedAt: checklist.completedAt?.toISOString() ?? null,
    createdAt: checklist.createdAt.toISOString(),
    updatedAt: checklist.updatedAt.toISOString(),
  };
}
