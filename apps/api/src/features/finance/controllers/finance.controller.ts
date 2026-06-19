import { Hono, type Context } from "hono";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  attachFinanceDocumentSchema,
  cancelFinanceEntrySchema,
  createCommissionRuleSchema,
  createFinanceEntrySchema,
  createRecurringEntrySchema,
  financeDocumentUploadSchema,
  listCommissionRulesQuerySchema,
  listFinanceEntriesQuerySchema,
  listRecurringEntriesQuerySchema,
  payFinanceEntrySchema,
  updateFinanceEntrySchema,
} from "./finance.controller.schemas.js";
import {
  cleanAttachDocumentInput,
  cleanCreateCommissionRuleInput,
  cleanCreateEntryInput,
  cleanCreateRecurringInput,
  cleanListCommissionRulesQuery,
  cleanListQuery,
  cleanListRecurringQuery,
  cleanUpdateEntryInput,
} from "./finance.controller.cleaners.js";
import {
  FinanceRequestValidationError,
  handleFinance,
  parseJson,
} from "./finance.controller.http.js";
import { financeServices, type FinanceServices } from "./financeServices.js";

export type FinanceContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateFinanceFeatureOptions = {
  contextFactory?: FinanceContextFactory;
  services?: FinanceServices;
};

export function createFinanceFeature(
  options: CreateFinanceFeatureOptions = {},
) {
  const financeFeature = new Hono();
  const services = options.services ?? financeServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedServiceContext(context, contextFactory);

  financeFeature.get("/summary", async (context) =>
    handleFinance(context, async () => {
      const serviceContext = await createContext(context);
      return context.json(await services.getSummary(serviceContext));
    }),
  );

  financeFeature.get("/entries", async (context) =>
    handleFinance(context, async () => {
      const parsed = listFinanceEntriesQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) {
        throw new FinanceRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const entries = await services.listEntries(
        serviceContext,
        cleanListQuery(parsed.data),
      );
      return context.json({ entries });
    }),
  );

  financeFeature.post("/entries", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, createFinanceEntrySchema);
      const serviceContext = await createContext(context);
      const bundle = await services.createEntry(
        serviceContext,
        cleanCreateEntryInput(input),
      );
      return context.json(bundle, 201);
    }),
  );

  financeFeature.patch("/entries/:entryId", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, updateFinanceEntrySchema);
      const serviceContext = await createContext(context);
      const bundle = await services.updateEntry(
        serviceContext,
        cleanUpdateEntryInput(context.req.param("entryId"), input),
      );
      return context.json(bundle);
    }),
  );

  financeFeature.post("/entries/:entryId/pay", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, payFinanceEntrySchema);
      const serviceContext = await createContext(context);
      const bundle = await services.payEntry(serviceContext, {
        entryId: context.req.param("entryId"),
        paidAt: input.paidAt ?? null,
      });
      return context.json(bundle);
    }),
  );

  financeFeature.post("/entries/:entryId/cancel", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, cancelFinanceEntrySchema);
      const serviceContext = await createContext(context);
      const bundle = await services.cancelEntry(serviceContext, {
        entryId: context.req.param("entryId"),
        reason: input.reason ?? null,
      });
      return context.json(bundle);
    }),
  );

  financeFeature.post("/entries/:entryId/documents/uploads", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, financeDocumentUploadSchema);
      const serviceContext = await createContext(context);
      const upload = await services.requestDocumentUpload(serviceContext, {
        ...input,
        entryId: context.req.param("entryId"),
      });
      return context.json(upload, 201);
    }),
  );

  financeFeature.post("/entries/:entryId/documents", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, attachFinanceDocumentSchema);
      const serviceContext = await createContext(context);
      const document = await services.attachDocument(
        serviceContext,
        cleanAttachDocumentInput(context.req.param("entryId"), input),
      );
      return context.json(document, 201);
    }),
  );

  financeFeature.get("/recurring-entries", async (context) =>
    handleFinance(context, async () => {
      const parsed = listRecurringEntriesQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) {
        throw new FinanceRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const recurringEntries = await services.listRecurringEntries(
        serviceContext,
        cleanListRecurringQuery(parsed.data),
      );
      return context.json({ recurringEntries });
    }),
  );

  financeFeature.post("/recurring-entries", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, createRecurringEntrySchema);
      const serviceContext = await createContext(context);
      const recurringEntry = await services.createRecurringEntry(
        serviceContext,
        cleanCreateRecurringInput(input),
      );
      return context.json(recurringEntry, 201);
    }),
  );

  financeFeature.get("/commission-rules", async (context) =>
    handleFinance(context, async () => {
      const parsed = listCommissionRulesQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) {
        throw new FinanceRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const commissionRules = await services.listCommissionRules(
        serviceContext,
        cleanListCommissionRulesQuery(parsed.data),
      );
      return context.json({ commissionRules });
    }),
  );

  financeFeature.post("/commission-rules", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, createCommissionRuleSchema);
      const serviceContext = await createContext(context);
      const commissionRule = await services.createCommissionRule(
        serviceContext,
        cleanCreateCommissionRuleInput(input),
      );
      return context.json(commissionRule, 201);
    }),
  );

  return financeFeature;
}

async function createProtectedServiceContext(
  context: Context,
  contextFactory: FinanceContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);

  if (!["integration", "user"].includes(serviceContext.actor.kind)) {
    throw new HttpContextAuthenticationError(
      "Finance routes require authenticated user or integration context.",
    );
  }

  return serviceContext;
}
