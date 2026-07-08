import { Hono, type Context } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  createMarketplaceSyncJobSchema,
  completeMarketplaceConnectionSchema,
  createMarketplaceConnectUrlSchema,
  marketplaceStockSyncPreviewSchema,
  marketplaceStockSyncRunSchema,
  marketplaceSyncJobRetrySchema,
  upsertMarketplaceAccountSchema,
} from "./marketplace.controller.schemas.js";
import {
  marketplaceServices,
  type MarketplaceServices,
} from "./marketplaceServices.js";
import {
  marketplaceErrorResponse,
  MarketplaceRequestValidationError,
} from "./marketplaceErrorResponses.js";

export type MarketplaceContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateMarketplaceFeatureOptions = {
  contextFactory?: MarketplaceContextFactory;
  services?: MarketplaceServices;
};

export function createMarketplaceFeature(
  options: CreateMarketplaceFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? marketplaceServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/overview", async (context) =>
    handleMarketplace(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(await services.listOverview(serviceContext));
    }),
  );

  feature.post("/connect-url", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(context, createMarketplaceConnectUrlSchema);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.createConnectUrl(serviceContext, input),
      );
    }),
  );

  feature.post("/oauth/complete", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(
        context,
        completeMarketplaceConnectionSchema,
      );
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.completeConnection(serviceContext, input),
      );
    }),
  );

  feature.put("/integrations/:provider", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(context, upsertMarketplaceAccountSchema);
      ensureProviderMatch(context.req.param("provider"), input.provider);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.upsertAccount(serviceContext, {
          ...(input.config !== undefined ? { config: input.config } : {}),
          provider: input.provider,
          status: input.status,
        }),
      );
    }),
  );

  feature.post("/integrations/:provider/sync-jobs", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(context, createMarketplaceSyncJobSchema);
      ensureProviderMatch(context.req.param("provider"), input.provider);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.createSyncJob(serviceContext, {
          jobType: input.jobType,
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
          provider: input.provider,
        }),
      );
    }),
  );

  feature.post("/integrations/:provider/stock-sync/preview", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(context, marketplaceStockSyncPreviewSchema);
      ensureProviderMatch(context.req.param("provider"), input.provider);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.previewStockSync(serviceContext, {
          ...(input.listingIds ? { listingIds: input.listingIds } : {}),
          provider: input.provider,
        }),
      );
    }),
  );

  feature.post("/integrations/:provider/stock-sync/run", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(context, marketplaceStockSyncRunSchema);
      ensureProviderMatch(context.req.param("provider"), input.provider);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.runStockSync(serviceContext, {
          ...(input.batchId ? { batchId: input.batchId } : {}),
          ...(input.listingIds ? { listingIds: input.listingIds } : {}),
          provider: input.provider,
        }),
      );
    }),
  );

  feature.post("/sync-jobs/:jobId/retry", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(context, marketplaceSyncJobRetrySchema);
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.retrySyncJob(serviceContext, {
          jobId: context.req.param("jobId"),
          ...(input.reason ? { reason: input.reason } : {}),
        }),
      );
    }),
  );

  feature.post("/sync-jobs/:jobId/run", async (context) =>
    handleMarketplace(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.runSyncJob(serviceContext, {
          jobId: context.req.param("jobId"),
        }),
      );
    }),
  );

  return feature;
}

async function createProtectedContext(
  context: Context,
  contextFactory: MarketplaceContextFactory,
) {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Marketplace requires user context.",
    );
  }
  return serviceContext;
}

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let payload: unknown;
  try {
    payload = await context.req.json();
  } catch {
    throw new MarketplaceRequestValidationError("Request body is invalid.");
  }
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new MarketplaceRequestValidationError("Request body is invalid.", {
      issues: result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
      })),
    });
  }
  return result.data;
}

async function handleMarketplace(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    return marketplaceErrorResponse(context, error);
  }
}

function ensureProviderMatch(routeProvider: string, bodyProvider: string) {
  if (routeProvider !== bodyProvider) {
    throw new MarketplaceRequestValidationError("Provider route mismatch.", {
      bodyProvider,
      routeProvider,
    });
  }
}
