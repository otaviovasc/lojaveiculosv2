import { Hono, type Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { MarketplaceAccountMissingError } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { MarketplaceScopeError } from "../../../domains/marketplace/services/MarketplaceService/serviceSupport.js";
import { MarketplaceProviderRuntimeError } from "../../../domains/marketplace/services/MarketplaceService/serviceSupport.js";
import {
  createMarketplaceSyncJobSchema,
  completeMarketplaceConnectionSchema,
  createMarketplaceConnectUrlSchema,
  upsertMarketplaceAccountSchema,
} from "./marketplace.controller.schemas.js";
import {
  marketplaceServices,
  type MarketplaceServices,
} from "./marketplaceServices.js";

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
  try {
    return schema.parse(await context.req.json());
  } catch {
    throw new MarketplaceRequestValidationError("Request body is invalid.");
  }
}

async function handleMarketplace(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof MarketplaceRequestValidationError ||
      error instanceof MarketplaceAccountMissingError ||
      error instanceof MarketplaceProviderRuntimeError ||
      error instanceof MarketplaceScopeError
    ) {
      return jsonApiError(context, {
        code: "MARKETPLACE_REQUEST_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof HttpContextAuthenticationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHENTICATION_REQUIRED",
        error,
        message: error.message,
        status: 401,
      });
    }
    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }
    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}

function ensureProviderMatch(routeProvider: string, bodyProvider: string) {
  if (routeProvider !== bodyProvider) {
    throw new MarketplaceRequestValidationError("Provider route mismatch.");
  }
}

class MarketplaceRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketplaceRequestValidationError";
  }
}
