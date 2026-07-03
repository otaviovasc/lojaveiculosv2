import { Hono, type Context } from "hono";
import type { z } from "zod";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  CrmLeadNotFoundError,
  CrmScopeError,
} from "../../../domains/crm/services/CrmService/serviceSupport.js";
import {
  cleanCreateActivityInput,
  cleanCreateLeadInput,
  cleanListLeadsInput,
  cleanUpdateLeadInput,
} from "./crm.controller.cleaners.js";
import {
  createActivitySchema,
  createLeadSchema,
  listActivitiesQuerySchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from "./crm.controller.schemas.js";
import { crmServices, type CrmServices } from "./crmServices.js";
import { registerCrmWhatsappRoutes } from "./crm.whatsapp.controller.js";

export type CrmContextFactory = (context: Context) => Promise<ServiceContext>;

export type CreateCrmFeatureOptions = {
  contextFactory?: CrmContextFactory;
  realtimeBroker?: CrmRealtimeBroker;
  services?: CrmServices;
  webhookContextFactory?: CrmContextFactory;
};

export function createCrmFeature(options: CreateCrmFeatureOptions = {}) {
  const crmFeature = new Hono();
  const services = options.services ?? crmServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  crmFeature.get("/leads", async (context) =>
    handleCrm(context, async () => {
      const parsed = listLeadsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new CrmRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const leads = await services.listLeads(
        serviceContext,
        cleanListLeadsInput(parsed.data),
      );
      return context.json({ leads });
    }),
  );

  crmFeature.post("/leads", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, createLeadSchema);
      const serviceContext = await createContext(context);
      const lead = await services.createLead(
        serviceContext,
        cleanCreateLeadInput(input),
      );
      return context.json(lead, 201);
    }),
  );

  crmFeature.patch("/leads/:leadId", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, updateLeadSchema);
      const serviceContext = await createContext(context);
      const lead = await services.updateLead(serviceContext, {
        ...cleanUpdateLeadInput(input),
        leadId: context.req.param("leadId"),
      });
      return context.json(lead);
    }),
  );

  crmFeature.get("/leads/:leadId/activities", async (context) =>
    handleCrm(context, async () => {
      const parsed = listActivitiesQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new CrmRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const activities = await services.listActivities(serviceContext, {
        leadId: context.req.param("leadId"),
        limit: parsed.data.limit,
      });
      return context.json({ activities });
    }),
  );

  crmFeature.post("/leads/:leadId/activities", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, createActivitySchema);
      const serviceContext = await createContext(context);
      const activity = await services.createActivity(
        serviceContext,
        cleanCreateActivityInput(context.req.param("leadId"), input),
      );
      return context.json(activity, 201);
    }),
  );

  registerCrmWhatsappRoutes(crmFeature, {
    createContext,
    ...(options.webhookContextFactory
      ? { createWebhookContext: options.webhookContextFactory }
      : {}),
    ...(options.realtimeBroker
      ? { realtimeBroker: options.realtimeBroker }
      : {}),
    services,
  });

  return crmFeature;
}

async function createProtectedServiceContext(
  context: Context,
  contextFactory: CrmContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);

  if (!["integration", "user"].includes(serviceContext.actor.kind)) {
    throw new HttpContextAuthenticationError(
      "CRM routes require authenticated user or integration context.",
    );
  }

  return serviceContext;
}

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new CrmRequestValidationError("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new CrmRequestValidationError("Request body is invalid.");
  }

  return parsed.data;
}

async function handleCrm(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof CrmRequestValidationError) {
      return jsonApiError(context, {
        code: "CRM_REQUEST_VALIDATION_ERROR",
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

    if (error instanceof HttpContextRequestPolicyError) {
      return jsonApiError(context, {
        code: "HTTP_REQUEST_POLICY_ERROR",
        error,
        message: error.message,
        status: error.statusCode,
      });
    }

    if (error instanceof CrmLeadNotFoundError) {
      return jsonApiError(context, {
        code: "CRM_LEAD_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof CrmScopeError) {
      return jsonApiError(context, {
        code: "CRM_SCOPE_ERROR",
        error,
        message: error.message,
        status: 400,
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

export class CrmRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmRequestValidationError";
  }
}
