import { Hono, type Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AnalyticsScopeError } from "../../../domains/analytics/services/AnalyticsService/serviceSupport.js";
import {
  analyticsServices,
  type AnalyticsServices,
} from "./analyticsServices.js";

export type AnalyticsContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateAnalyticsFeatureOptions = {
  contextFactory?: AnalyticsContextFactory;
  services?: AnalyticsServices;
};

export function createAnalyticsFeature(
  options: CreateAnalyticsFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? analyticsServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/dashboard", async (context) =>
    handleAnalytics(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.getDashboard(serviceContext));
    }),
  );

  return feature;
}

async function createUserContext(
  context: Context,
  contextFactory: AnalyticsContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Analytics routes require user context.",
    );
  }
  return serviceContext;
}

async function handleAnalytics(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AnalyticsScopeError) {
      return jsonApiError(context, {
        code: "ANALYTICS_SCOPE_ERROR",
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
