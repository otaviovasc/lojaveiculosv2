import { type Context, type Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  cleanCreateFinanceAutoEntryRuleInput,
  cleanListFinanceAutoEntryRulesQuery,
  cleanUpdateFinanceAutoEntryRuleInput,
} from "./finance.controller.cleaners.js";
import {
  createFinanceAutoEntryRuleSchema,
  listFinanceAutoEntryRulesQuerySchema,
  updateFinanceAutoEntryRuleSchema,
} from "./finance.controller.schemas.js";
import {
  FinanceRequestValidationError,
  handleFinance,
  parseJson,
} from "./finance.controller.http.js";
import type { FinanceServices } from "./financeServices.js";
import { presentFinanceAutoEntryRule } from "./financeAutoEntryRulePresenter.js";

export function registerFinanceAutoEntryRuleRoutes(
  financeFeature: Hono,
  services: FinanceServices,
  createContext: (context: Context) => Promise<ServiceContext>,
): void {
  financeFeature.get("/auto-entry-rules", async (context) =>
    handleFinance(context, async () => {
      const parsed = listFinanceAutoEntryRulesQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) {
        throw new FinanceRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      const rules = await services.listAutoEntryRules(
        serviceContext,
        cleanListFinanceAutoEntryRulesQuery(parsed.data),
      );
      return context.json({ rules: rules.map(presentFinanceAutoEntryRule) });
    }),
  );

  financeFeature.post("/auto-entry-rules", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, createFinanceAutoEntryRuleSchema);
      const serviceContext = await createContext(context);
      const rule = await services.createAutoEntryRule(
        serviceContext,
        cleanCreateFinanceAutoEntryRuleInput(input),
      );
      return context.json({ rule: presentFinanceAutoEntryRule(rule) }, 201);
    }),
  );

  financeFeature.patch("/auto-entry-rules/:ruleId", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, updateFinanceAutoEntryRuleSchema);
      const serviceContext = await createContext(context);
      const rule = await services.updateAutoEntryRule(
        serviceContext,
        cleanUpdateFinanceAutoEntryRuleInput(
          context.req.param("ruleId"),
          input,
        ),
      );
      return context.json({ rule: presentFinanceAutoEntryRule(rule) });
    }),
  );

  financeFeature.delete("/auto-entry-rules/:ruleId", async (context) =>
    handleFinance(context, async () => {
      const serviceContext = await createContext(context);
      const rule = await services.deactivateAutoEntryRule(serviceContext, {
        ruleId: context.req.param("ruleId"),
      });
      return context.json({ rule: presentFinanceAutoEntryRule(rule) });
    }),
  );
}
