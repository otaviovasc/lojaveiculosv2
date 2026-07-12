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
  FiscalDocumentNotFoundError,
  FiscalProviderReferenceMissingError,
  FiscalScopeError,
} from "../../../domains/fiscal/services/FiscalService/serviceSupport.js";
import {
  cancelFiscalDocumentSchema,
  issueFiscalDocumentSchema,
  syncFiscalDocumentSchema,
} from "./fiscal.controller.schemas.js";
import { fiscalServices, type FiscalServices } from "./fiscalServices.js";

export type FiscalContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateFiscalFeatureOptions = {
  contextFactory?: FiscalContextFactory;
  services?: FiscalServices;
};

export function createFiscalFeature(options: CreateFiscalFeatureOptions = {}) {
  const feature = new Hono();
  const services = options.services ?? fiscalServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));

  feature.get("/overview", async (context) =>
    handleFiscal(context, async () => {
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(await services.getOverview(serviceContext));
    }),
  );

  feature.post("/documents", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, issueFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.issueDocument(serviceContext, {
          documentType: input.documentType,
          externalReference: input.externalReference,
          ...(input.metadata ? { metadata: input.metadata } : {}),
        }),
        201,
      );
    }),
  );

  feature.post("/documents/:documentId/cancel", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, cancelFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.cancelDocument(serviceContext, {
          documentId: context.req.param("documentId"),
          reason: input.reason,
        }),
      );
    }),
  );

  feature.post("/documents/:documentId/status-sync", async (context) =>
    handleFiscal(context, async () => {
      await parseJson(context, syncFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.syncDocumentStatus(serviceContext, {
          documentId: context.req.param("documentId"),
        }),
      );
    }),
  );

  return feature;
}

async function createUserContext(
  context: Context,
  contextFactory: FiscalContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Fiscal routes require user context.",
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
    throw new FiscalRequestValidationError("Request body is invalid.");
  }
}

async function handleFiscal(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof FiscalRequestValidationError ||
      error instanceof FiscalScopeError
    ) {
      return jsonApiError(context, {
        code: "FISCAL_REQUEST_ERROR",
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
    if (error instanceof FiscalDocumentNotFoundError) {
      return jsonApiError(context, {
        code: "FISCAL_DOCUMENT_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (error instanceof FiscalProviderReferenceMissingError) {
      return jsonApiError(context, {
        code: "FISCAL_PROVIDER_REFERENCE_MISSING",
        error,
        message: error.message,
        status: 409,
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
    if (isFiscalProviderRuntimeError(error)) {
      return jsonApiError(context, {
        code: "FISCAL_PROVIDER_UNAVAILABLE",
        error,
        message: error.message,
        status: 503,
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

function isFiscalProviderRuntimeError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.name === "SpedyGatewayConfigurationError" ||
      error.name === "SpedyGatewayHttpError")
  );
}

class FiscalRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FiscalRequestValidationError";
  }
}
