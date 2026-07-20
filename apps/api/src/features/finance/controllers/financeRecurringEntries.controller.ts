import { type Context, type Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  cleanCreateRecurringInput,
  cleanListRecurringQuery,
  cleanUpdateRecurringInput,
} from "./financeRecurringEntries.controller.cleaners.js";
import {
  createRecurringEntrySchema,
  listRecurringEntriesQuerySchema,
  materializeRecurringEntriesSchema,
  updateRecurringEntrySchema,
} from "./finance.controller.schemas.js";
import {
  FinanceRequestValidationError,
  handleFinance,
  parseJson,
} from "./finance.controller.http.js";
import type { FinanceServices } from "./financeServices.js";

export function registerFinanceRecurringEntryRoutes(
  financeFeature: Hono,
  services: FinanceServices,
  createContext: (context: Context) => Promise<ServiceContext>,
): void {
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

  financeFeature.post("/recurring-entries/materialize", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, materializeRecurringEntriesSchema);
      const serviceContext = await createContext(context);
      const result = await services.materializeRecurringEntries(
        serviceContext,
        {
          ...(input.asOf !== undefined ? { asOf: input.asOf } : {}),
        },
      );
      return context.json(result);
    }),
  );

  financeFeature.patch(
    "/recurring-entries/:recurringEntryId",
    async (context) =>
      handleFinance(context, async () => {
        const input = await parseJson(context, updateRecurringEntrySchema);
        const serviceContext = await createContext(context);
        const recurringEntry = await services.updateRecurringEntry(
          serviceContext,
          cleanUpdateRecurringInput(
            context.req.param("recurringEntryId"),
            input,
          ),
        );
        return context.json(recurringEntry);
      }),
  );

  financeFeature.delete(
    "/recurring-entries/:recurringEntryId",
    async (context) =>
      handleFinance(context, async () => {
        const serviceContext = await createContext(context);
        const recurringEntry = await services.cancelRecurringEntry(
          serviceContext,
          {
            reason: context.req.query("reason")?.trim() || "deleted",
            recurringEntryId: context.req.param("recurringEntryId"),
          },
        );
        return context.json(recurringEntry);
      }),
  );
}
