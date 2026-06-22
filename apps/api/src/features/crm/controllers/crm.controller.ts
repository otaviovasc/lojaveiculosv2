import { Hono, type Context } from "hono";
import type { z } from "zod";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
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
  services?: CrmServices;
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

  registerCrmWhatsappRoutes(crmFeature, { createContext, services });

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

    if (error instanceof HttpContextRequestPolicyError) {
      return context.json({ message: error.message }, error.statusCode);
    }

    if (error instanceof CrmLeadNotFoundError) {
      return context.json({ message: error.message }, 404);
    }

    if (error instanceof CrmScopeError) {
      return context.json({ message: error.message }, 400);
    }

    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

export class CrmRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmRequestValidationError";
  }
}
