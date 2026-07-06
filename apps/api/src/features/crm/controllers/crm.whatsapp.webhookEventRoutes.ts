import type { Context, Hono } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  assertWhatsappRead,
  assertWhatsappSend,
} from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import type { CrmServices } from "./crmServices.js";

const webhookEventsQuerySchema = z.object({
  connectionId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

type RegisterCrmWhatsappWebhookEventRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappWebhookEventRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappWebhookEventRoutesOptions,
) {
  crmFeature.get("/whatsapp/provider-events/issues", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = webhookEventsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      assertWhatsappRead(serviceContext);
      const events = await services.listWhatsappWebhookEventIssues(
        serviceContext,
        {
          ...(parsed.data.connectionId
            ? { connectionId: parsed.data.connectionId }
            : {}),
          limit: parsed.data.limit,
          offset: parsed.data.offset,
        },
      );
      return context.json({ events });
    }),
  );

  crmFeature.post("/whatsapp/provider-events/:eventId/retry", async (context) =>
    handleWhatsapp(context, async () => {
      const eventId = context.req.param("eventId");
      if (!eventId) {
        throw new CrmWhatsappValidationError("Route param eventId is invalid.");
      }
      const serviceContext = await createContext(context);
      assertWhatsappSend(serviceContext);
      const result = await services.retryWhatsappWebhookEvent(serviceContext, {
        eventId,
      });
      return context.json(result);
    }),
  );
}
