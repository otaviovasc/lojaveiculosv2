import { Hono, type Context } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  createMarketplaceSyncJobSchema,
  completeMarketplaceConnectionSchema,
  createMarketplaceConnectUrlSchema,
  ensureMarketplaceProviderMatch,
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
  createProtectedMarketplaceContext as createProtectedContext,
  handleMarketplace,
  parseMarketplaceJson as parseJson,
} from "./marketplace.controller.support.js";

export type MarketplaceContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateMarketplaceFeatureOptions = {
  callbackContextFactory?: MarketplaceContextFactory;
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
      ensureMarketplaceProviderMatch(
        context.req.param("provider"),
        input.provider,
      );
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.upsertAccount(serviceContext, {
          provider: input.provider,
          status: input.status,
        }),
      );
    }),
  );

  feature.post("/integrations/:provider/sync-jobs", async (context) =>
    handleMarketplace(context, async () => {
      const input = await parseJson(context, createMarketplaceSyncJobSchema);
      ensureMarketplaceProviderMatch(
        context.req.param("provider"),
        input.provider,
      );
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
      ensureMarketplaceProviderMatch(
        context.req.param("provider"),
        input.provider,
      );
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
      ensureMarketplaceProviderMatch(
        context.req.param("provider"),
        input.provider,
      );
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

  feature.post("/sync-jobs/:jobId/reconcile", async (context) =>
    handleMarketplace(context, async () => {
      const serviceContext = await createProtectedContext(
        context,
        contextFactory,
      );
      return context.json(
        await services.reconcileSyncJob(serviceContext, {
          jobId: context.req.param("jobId"),
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
