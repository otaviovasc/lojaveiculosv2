import { type Context, type Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  FinanceRequestValidationError,
  handleFinance,
  parseJson,
} from "./finance.controller.http.js";
import type { FinanceServices } from "./financeServices.js";
import {
  commissionWorkspaceQuerySchema,
  settleCommissionEntriesSchema,
} from "./commissionWorkspace.controller.schemas.js";

export function registerCommissionWorkspaceRoutes(
  financeFeature: Hono,
  services: FinanceServices,
  createContext: (context: Context) => Promise<ServiceContext>,
): void {
  financeFeature.get("/commissions/workspace", async (context) =>
    handleFinance(context, async () => {
      const parsed = commissionWorkspaceQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) {
        throw new FinanceRequestValidationError("Request query is invalid.");
      }
      const serviceContext = await createContext(context);
      return context.json(
        await services.getCommissionWorkspace(serviceContext, parsed.data),
      );
    }),
  );

  financeFeature.post("/commissions/settlements", async (context) =>
    handleFinance(context, async () => {
      const input = await parseJson(context, settleCommissionEntriesSchema);
      const serviceContext = await createContext(context);
      return context.json(
        await services.settleCommissionEntries(serviceContext, {
          entryIds: input.entryIds,
          paidAt: input.paidAt,
          sellerUserId: input.sellerUserId,
        }),
      );
    }),
  );
}
