import type { Context, Hono } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServices } from "./crmServices.js";
import { CrmRequestValidationError } from "./crm.controller.errors.js";
import {
  createVisitSchema,
  listVisitsQuerySchema,
  updateVisitSchema,
} from "./crm.visits.schemas.js";

type RouteSupport = {
  createContext: (context: Context) => Promise<ServiceContext>;
  handleCrm: (
    context: Context,
    action: () => Promise<Response>,
  ) => Promise<Response>;
  parseJson: <Schema extends z.ZodType>(
    context: Context,
    schema: Schema,
  ) => Promise<z.infer<Schema>>;
  services: CrmServices;
};

export function registerCrmVisitRoutes(
  crmFeature: Hono,
  support: RouteSupport,
) {
  const { createContext, handleCrm, parseJson, services } = support;

  crmFeature.get("/visits", async (context) =>
    handleCrm(context, async () => {
      const parsed = listVisitsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new CrmRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const visits = await services.listVisits(
        serviceContext,
        cleanListVisitsInput(parsed.data),
      );
      return context.json({ visits });
    }),
  );

  crmFeature.post("/visits", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, createVisitSchema);
      const serviceContext = await createContext(context);
      const visit = await services.createVisit(serviceContext, {
        ...cleanCreateVisitInput(input),
      });
      return context.json(visit, 201);
    }),
  );

  crmFeature.patch("/visits/:visitId", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, updateVisitSchema);
      const serviceContext = await createContext(context);
      const visit = await services.updateVisit(serviceContext, {
        ...cleanUpdateVisitInput(input),
        visitId: context.req.param("visitId"),
      });
      return context.json(visit);
    }),
  );

  crmFeature.post("/visits/:visitId/cancel", async (context) =>
    handleCrm(context, async () => {
      const serviceContext = await createContext(context);
      const visit = await services.cancelVisit(serviceContext, {
        visitId: context.req.param("visitId"),
      });
      return context.json(visit);
    }),
  );

  crmFeature.post("/visits/:visitId/complete", async (context) =>
    handleCrm(context, async () => {
      const serviceContext = await createContext(context);
      const visit = await services.completeVisit(serviceContext, {
        visitId: context.req.param("visitId"),
      });
      return context.json(visit);
    }),
  );
}

function cleanListVisitsInput(input: z.infer<typeof listVisitsQuerySchema>) {
  return {
    ...(input.from ? { from: new Date(input.from) } : {}),
    ...(input.leadId ? { leadId: input.leadId } : {}),
    limit: input.limit,
    offset: input.offset,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.to ? { to: new Date(input.to) } : {}),
  };
}

function cleanCreateVisitInput(input: z.infer<typeof createVisitSchema>) {
  return {
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId }
      : {}),
    leadId: input.leadId,
    ...(input.listingId !== undefined ? { listingId: input.listingId } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    scheduledAt: new Date(input.scheduledAt),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
  };
}

function cleanUpdateVisitInput(input: z.infer<typeof updateVisitSchema>) {
  return {
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId }
      : {}),
    ...(input.listingId !== undefined ? { listingId: input.listingId } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}
