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
import {
  InternalMonitoringPlatformScopeError,
  InternalMonitoringScopeError,
} from "../../../domains/internal/services/InternalMonitoringService/serviceSupport.js";
import {
  internalMonitoringServices,
  type InternalMonitoringServices,
} from "./internalMonitoringServices.js";

const healthQuerySchema = z
  .object({
    action: z.string().trim().min(1).max(120).optional(),
    actorId: z.string().trim().min(1).max(191).optional(),
    category: z
      .enum([
        "authentication",
        "authorization",
        "data_access",
        "data_change",
        "integration",
        "system",
      ])
      .optional(),
    correlationId: z.string().trim().min(1).max(191).optional(),
    criticality: z.enum(["low", "medium", "high", "critical"]).optional(),
    entityId: z.string().trim().min(1).max(191).optional(),
    entityType: z.string().trim().min(1).max(120).optional(),
    from: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(40),
    outcome: z.enum(["attempted", "succeeded", "failed", "denied"]).optional(),
    providerName: z.string().trim().min(1).max(120).optional(),
    requestId: z.string().trim().min(1).max(191).optional(),
    severity: z
      .enum(["debug", "info", "warning", "error", "critical"])
      .optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((value, refinementContext) => {
    if (value.from && value.to && value.from > value.to) {
      refinementContext.addIssue({
        code: "custom",
        message: "from must be earlier than or equal to to",
        path: ["to"],
      });
    }
  });

export type InternalMonitoringContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateInternalMonitoringFeatureOptions = {
  accountContextFactory?: InternalMonitoringContextFactory;
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
  const accountContextFactory = options.accountContextFactory;

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
        await services.getHealth(serviceContext, parsed.data),
      );
    }),
  );

  feature.get("/platform/health", async (context) =>
    handleInternalMonitoring(context, async () => {
      const parsed = healthQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new InternalMonitoringRequestValidationError(
          "Request query is invalid.",
        );
      }
      if (!accountContextFactory) {
        throw new InternalMonitoringPlatformScopeError();
      }
      const serviceContext = await createUserContext(
        context,
        accountContextFactory,
      );
      return context.json(
        await services.getPlatformHealth(serviceContext, parsed.data),
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
      error instanceof HttpContextAuthorizationError ||
      error instanceof InternalMonitoringPlatformScopeError
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
