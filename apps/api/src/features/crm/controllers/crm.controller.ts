import { Hono, type Context } from "hono";
import type { z } from "zod";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
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
import { registerCrmPipelineRoutes } from "./crm.pipeline.routes.js";
import { registerCrmVisitRoutes } from "./crm.visits.routes.js";
import {
  CrmRequestValidationError,
  handleCrm,
} from "./crm.controller.errors.js";
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

  registerCrmPipelineRoutes(crmFeature, {
    createContext,
    handleCrm,
    parseJson,
    services,
  });

  registerCrmVisitRoutes(crmFeature, {
    createContext,
    handleCrm,
    parseJson,
    services,
  });

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

export async function parseJson<Schema extends z.ZodType>(
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
