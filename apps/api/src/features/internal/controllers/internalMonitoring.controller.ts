import { Hono, type Context } from "hono";
import { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { InternalMonitoringScopeError } from "../../../domains/internal/services/InternalMonitoringService/serviceSupport.js";
import {
  internalMonitoringServices,
  type InternalMonitoringServices,
} from "./internalMonitoringServices.js";

const healthQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export type InternalMonitoringContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateInternalMonitoringFeatureOptions = {
  contextFactory?: InternalMonitoringContextFactory;
  services?: InternalMonitoringServices;
};

export function createInternalMonitoringFeature(
  options: CreateInternalMonitoringFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? internalMonitoringServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/health", async (context) =>
    handleInternalMonitoring(context, async () => {
      const parsed = healthQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new InternalMonitoringRequestValidationError(
          "Request query is invalid.",
        );
      }
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.getHealth(serviceContext, { limit: parsed.data.limit }),
      );
    }),
  );

  return feature;
}

async function createUserContext(
  context: Context,
  contextFactory: InternalMonitoringContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Internal monitoring requires user context.",
    );
  }
  return serviceContext;
}

async function handleInternalMonitoring(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof InternalMonitoringRequestValidationError ||
      error instanceof InternalMonitoringScopeError
    ) {
      return jsonApiError(context, {
        code: "INTERNAL_MONITORING_REQUEST_ERROR",
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

class InternalMonitoringRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalMonitoringRequestValidationError";
  }
}
