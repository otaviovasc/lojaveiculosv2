import { Hono, type Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  ExternalApiClientNotFoundError,
  ExternalApiScopeError,
  ExternalApiScopeValidationError,
} from "../../../domains/externalApi/services/ExternalApiService/serviceSupport.js";
import { createExternalApiClientSchema } from "./externalApi.controller.schemas.js";
import {
  externalApiServices,
  type ExternalApiServices,
} from "./externalApiServices.js";

export type ExternalApiContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateExternalApiFeatureOptions = {
  contextFactory?: ExternalApiContextFactory;
  services?: ExternalApiServices;
};

export function createExternalApiFeature(
  options: CreateExternalApiFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? externalApiServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/clients", async (context) =>
    handleExternalApi(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json({
        clients: await services.listClients(serviceContext),
      });
    }),
  );

  feature.post("/clients", async (context) =>
    handleExternalApi(context, async () => {
      const input = await parseJson(context, createExternalApiClientSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      const result = await services.createClient(serviceContext, input);
      return context.json(result, 201);
    }),
  );

  feature.post("/clients/:clientId/revoke", async (context) =>
    handleExternalApi(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      const client = await services.revokeClient(serviceContext, {
        clientId: context.req.param("clientId"),
      });
      return context.json(client);
    }),
  );

  return feature;
}

async function createUserContext(
  context: Context,
  contextFactory: ExternalApiContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "External API management requires user context.",
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
    throw new ExternalApiRequestValidationError("Request body is invalid.");
  }
}

async function handleExternalApi(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof ExternalApiRequestValidationError ||
      error instanceof ExternalApiScopeError ||
      error instanceof ExternalApiScopeValidationError
    ) {
      return jsonApiError(context, {
        code: "EXTERNAL_API_REQUEST_ERROR",
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
    if (error instanceof ExternalApiClientNotFoundError) {
      return jsonApiError(context, {
        code: "EXTERNAL_API_CLIENT_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
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

class ExternalApiRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalApiRequestValidationError";
  }
}
