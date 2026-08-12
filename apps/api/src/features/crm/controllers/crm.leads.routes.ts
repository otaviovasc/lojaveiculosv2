import type { Context, Hono } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { FinanceServices } from "../../finance/controllers/financeServices.js";
import {
  cleanCreateActivityInput,
  cleanCreateLeadInput,
  cleanListLeadBoardInput,
  cleanListLeadsInput,
  cleanUpdateLeadInput,
} from "./crm.controller.cleaners.js";
import { CrmRequestValidationError } from "./crm.controller.errors.js";
import {
  createActivitySchema,
  createLeadFinancialProductSchema,
  createLeadSchema,
  listActivitiesQuerySchema,
  listLeadBoardQuerySchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from "./crm.controller.schemas.js";
import {
  createCrmLeadFinancialProduct,
  type CrmFinancialProductTransactionRunner,
} from "./crmFinancialProducts.js";
import { encodeCrmLeadCursor } from "./crm.leadCursor.js";
import type { CrmServices } from "./crmServices.js";

type RouteSupport = {
  createContext: (context: Context) => Promise<ServiceContext>;
  financeServices: Pick<FinanceServices, "materializeAutoEntries">;
  financialProductTransactionRunner: CrmFinancialProductTransactionRunner;
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

export function registerCrmLeadCollectionRoutes(
  crmFeature: Hono,
  support: RouteSupport,
) {
  const { createContext, handleCrm, parseJson, services } = support;

  crmFeature.get("/leads/board", async (context) =>
    handleCrm(context, async () => {
      const parsed = listLeadBoardQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new CrmRequestValidationError("Request query is invalid.");
      }
      const stages = await services.listLeadBoard(
        await createContext(context),
        cleanListLeadBoardInput(parsed.data),
      );
      return context.json({
        stages: stages.map((stage) => ({
          leads: stage.items,
          nextCursor: encodeCrmLeadCursor(stage.nextCursor),
          pipelineStageId: stage.pipelineStageId,
          total: stage.total,
        })),
      });
    }),
  );

  crmFeature.get("/leads", async (context) =>
    handleCrm(context, async () => {
      const parsed = listLeadsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) {
        throw new CrmRequestValidationError("Request query is invalid.");
      }
      const page = await services.listLeads(
        await createContext(context),
        cleanListLeadsInput(parsed.data),
      );
      return context.json({
        leads: page.items,
        nextCursor: encodeCrmLeadCursor(page.nextCursor),
        total: page.total,
      });
    }),
  );

  crmFeature.post("/leads", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, createLeadSchema);
      const lead = await services.createLead(
        await createContext(context),
        cleanCreateLeadInput(input),
      );
      return context.json(lead, 201);
    }),
  );
}

export function registerCrmLeadDetailRoutes(
  crmFeature: Hono,
  support: RouteSupport,
) {
  const {
    createContext,
    financeServices,
    financialProductTransactionRunner,
    handleCrm,
    parseJson,
    services,
  } = support;

  crmFeature.patch("/leads/:leadId", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, updateLeadSchema);
      const lead = await services.updateLead(await createContext(context), {
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
      const activities = await services.listActivities(
        await createContext(context),
        { leadId: context.req.param("leadId"), limit: parsed.data.limit },
      );
      return context.json({ activities });
    }),
  );

  crmFeature.post("/leads/:leadId/activities", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, createActivitySchema);
      const activity = await services.createActivity(
        await createContext(context),
        cleanCreateActivityInput(context.req.param("leadId"), input),
      );
      return context.json(activity, 201);
    }),
  );

  crmFeature.post("/leads/:leadId/financial-products", async (context) =>
    handleCrm(context, async () => {
      const input = await parseJson(context, createLeadFinancialProductSchema);
      const result = await createCrmLeadFinancialProduct(
        await createContext(context),
        context.req.param("leadId"),
        input,
        services,
        financeServices,
        financialProductTransactionRunner,
      );
      return context.json(result, 201);
    }),
  );
}
