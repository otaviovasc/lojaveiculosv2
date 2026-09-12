import type { Context, Hono } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  assertConversationRead,
  assertMessageSend,
} from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import type { CrmServices } from "./crmServices.js";

const providerEventsQuerySchema = z.object({
  connectionId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

type RegisterCrmProviderEventRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmProviderEventRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmProviderEventRoutesOptions,
) {
  crmFeature.get("/provider-events", async (context) =>
    handleCrmMessaging(context, async () => {
      const parsed = providerEventsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const events = await services.listProviderEventIssues(serviceContext, {
        ...(parsed.data.connectionId
          ? { connectionId: parsed.data.connectionId }
          : {}),
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      });
      return context.json({ events });
    }),
  );

  crmFeature.post("/provider-events/:eventId/retry", async (context) =>
    handleCrmMessaging(context, async () => {
      const eventId = context.req.param("eventId");
      if (!eventId) {
        throw new CrmMessagingValidationError(
          "Route param eventId is invalid.",
        );
      }
      const serviceContext = await createContext(context);
      assertMessageSend(serviceContext);
      const result = await services.retryProviderEvent(serviceContext, {
        eventId,
      });
      return context.json(result);
    }),
  );
}
