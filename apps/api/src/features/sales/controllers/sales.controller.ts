import { Hono, type Context } from "hono";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  listSalesQuerySchema,
  revertSaleSchema,
  saleDraftSchema,
  transitionSaleSchema,
} from "./sales.controller.schemas.js";
import {
  handleSales,
  parseSalesJson,
  SalesRequestValidationError,
} from "./sales.controller.http.js";
import {
  cleanCreateSaleDraftInput,
  cleanListSalesQuery,
  cleanTransitionInput,
  cleanUpdateSaleDraftInput,
} from "./sales.controller.cleaners.js";
import { salesServices, type SalesServices } from "./salesServices.js";

export type SalesContextFactory = (context: Context) => Promise<ServiceContext>;

export type CreateSalesFeatureOptions = {
  contextFactory?: SalesContextFactory;
  services?: SalesServices;
};

export function createSalesFeature(options: CreateSalesFeatureOptions = {}) {
  const feature = new Hono();
  const services = options.services ?? salesServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  feature.get("/", async (context) =>
    handleSales(context, async () => {
      const parsed = listSalesQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new SalesRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const sales = await services.list(
        serviceContext,
        cleanListSalesQuery(parsed.data),
      );
      return context.json({ sales });
    }),
  );

  feature.post("/drafts", async (context) =>
    handleSales(context, async () => {
      const input = await parseSalesJson(context, saleDraftSchema);
      const serviceContext = await createContext(context);
      return context.json(
        await services.createDraft(
          serviceContext,
          cleanCreateSaleDraftInput(input),
        ),
        201,
      );
    }),
  );

  feature.patch("/:saleId", async (context) =>
    handleSales(context, async () => {
      const input = await parseSalesJson(context, saleDraftSchema);
      const serviceContext = await createContext(context);
      return context.json(
        await services.updateDraft(
          serviceContext,
          context.req.param("saleId"),
          cleanUpdateSaleDraftInput(input),
        ),
      );
    }),
  );

  feature.delete("/:saleId", async (context) =>
    handleSales(context, async () => {
      const serviceContext = await createContext(context);
      await services.delete(serviceContext, context.req.param("saleId"));
      return new Response(null, { status: 204 });
    }),
  );

  feature.post("/:saleId/revert", async (context) =>
    handleSales(context, async () => {
      const input = await parseSalesJson(context, revertSaleSchema);
      const serviceContext = await createContext(context);
      return context.json(
        await services.revert(serviceContext, {
          reason: input.reason,
          saleId: context.req.param("saleId"),
        }),
        201,
      );
    }),
  );

  for (const [path, status] of [
    ["reserve", "pending"],
    ["close", "closed"],
    ["cancel", "cancelled"],
  ] as const) {
    feature.post(`/:saleId/${path}`, async (context) =>
      handleSales(context, async () => {
        const input = await parseSalesJson(context, transitionSaleSchema);
        const serviceContext = await createContext(context);
        return context.json(
          await services.transition(serviceContext, {
            ...cleanTransitionInput(input),
            saleId: context.req.param("saleId"),
            status,
          }),
        );
      }),
    );
  }

  return feature;
}

async function createProtectedServiceContext(
  context: Context,
  contextFactory: SalesContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (!["integration", "user"].includes(serviceContext.actor.kind)) {
    throw new HttpContextAuthenticationError(
      "Sales routes require authenticated user or integration context.",
    );
  }
  return serviceContext;
}
