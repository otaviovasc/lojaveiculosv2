import { Hono, type Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { FiscalScopeError } from "../../../domains/fiscal/services/FiscalService/serviceSupport.js";
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
          providerDocumentId: input.providerDocumentId,
          reason: input.reason,
        }),
      );
    }),
  );

  feature.post("/documents/:documentId/status-sync", async (context) =>
    handleFiscal(context, async () => {
      const input = await parseJson(context, syncFiscalDocumentSchema);
      const serviceContext = await createUserContext(context, contextFactory);
      return context.json(
        await services.syncDocumentStatus(serviceContext, {
          documentId: context.req.param("documentId"),
          providerDocumentId: input.providerDocumentId,
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
      return context.json({ message: error.message }, 400);
    }
    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }
    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return context.json({ message: error.message }, 403);
    }

    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

class FiscalRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FiscalRequestValidationError";
  }
}
