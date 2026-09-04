import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { crmStatisticsQuerySchema } from "./crm.controller.schemas.js";
import { assertConversationRead } from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";

export function registerCrmStatisticsRoutes(
  crmFeature: Hono,
  options: {
    createContext: (context: Context) => Promise<ServiceContext>;
    services: CrmServices;
  },
) {
  crmFeature.get("/statistics", async (context) =>
    handleCrmMessaging(context, async () => {
      const parsed = crmStatisticsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmMessagingValidationError();
      const serviceContext = await options.createContext(context);
      assertConversationRead(serviceContext);
      return context.json(
        await options.services.getStatistics(serviceContext, {
          ...(parsed.data.connectionId
            ? { connectionId: parsed.data.connectionId }
            : {}),
          from: new Date(parsed.data.from),
          toExclusive: new Date(parsed.data.toExclusive),
        }),
      );
    }),
  );
}
