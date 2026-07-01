import { Hono, type Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { ComplianceScopeError } from "../../../domains/compliance/services/ComplianceService/serviceSupport.js";
import {
  complianceServices,
  type ComplianceServices,
} from "./complianceServices.js";

export type ComplianceContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateComplianceFeatureOptions = {
  contextFactory?: ComplianceContextFactory;
  services?: ComplianceServices;
};

export function createComplianceFeature(
  options: CreateComplianceFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? complianceServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/snapshot", async (context) =>
    handleCompliance(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.getSnapshot(serviceContext));
    }),
  );

  return feature;
}

async function createUserContext(
  context: Context,
  contextFactory: ComplianceContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Compliance routes require user context.",
    );
  }
  return serviceContext;
}

async function handleCompliance(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ComplianceScopeError) {
      return jsonApiError(context, {
        code: "COMPLIANCE_SCOPE_ERROR",
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
