import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { parseWhatsappJson } from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import { whatsappBotIntegrationUpdateSchema } from "./crm.whatsapp.integrationSchemas.js";
import type { CrmServices } from "./crmServices.js";
import type { UpdateWhatsappBotIntegrationInput } from "../../../domains/crm/services/CrmWhatsapp/whatsappBotIntegration.js";

type RegisterCrmWhatsappIntegrationRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappIntegrationRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappIntegrationRoutesOptions,
) {
  crmFeature.get("/whatsapp/integrations/bot", async (context) =>
    handleWhatsapp(context, async () => {
      const serviceContext = await createContext(context);
      const integration =
        await services.getWhatsappBotIntegration(serviceContext);
      return context.json({ integration });
    }),
  );

  crmFeature.patch("/whatsapp/integrations/bot", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappBotIntegrationUpdateSchema,
      );
      if (Object.keys(input).length === 0) {
        throw new CrmWhatsappValidationError(
          "No integration updates provided.",
        );
      }
      const serviceContext = await createContext(context);
      const integration = await services.updateWhatsappBotIntegration(
        serviceContext,
        cleanBotIntegrationUpdate(input),
      );
      return context.json({ integration });
    }),
  );
}

function cleanBotIntegrationUpdate(input: {
  enabled?: boolean | undefined;
  webhookSecret?: string | null | undefined;
  webhookUrl?: string | null | undefined;
}): UpdateWhatsappBotIntegrationInput {
  return {
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.webhookSecret !== undefined
      ? { webhookSecret: input.webhookSecret }
      : {}),
    ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
  };
}
