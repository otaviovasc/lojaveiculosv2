import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { parseWhatsappJson } from "./crm.whatsapp.controller.support.js";
import {
  CrmWhatsappValidationError,
  handleWhatsapp,
} from "./crm.whatsapp.errors.js";
import {
  whatsappCampaignParamSchema,
  whatsappCampaignsQuerySchema,
  whatsappCreateCampaignSchema,
} from "./crm.whatsapp.campaignSchemas.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmWhatsappCampaignRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmWhatsappCampaignRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmWhatsappCampaignRoutesOptions,
) {
  crmFeature.get("/whatsapp/campaigns", async (context) =>
    handleWhatsapp(context, async () => {
      const parsed = whatsappCampaignsQuerySchema.safeParse(
        context.req.query(),
      );
      if (!parsed.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      const campaigns = await services.listWhatsappCampaigns(serviceContext, {
        limit: parsed.data.limit,
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      });
      return context.json(campaigns);
    }),
  );

  crmFeature.get("/whatsapp/campaigns/:campaignId", async (context) =>
    handleWhatsapp(context, async () => {
      const params = whatsappCampaignParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmWhatsappValidationError();
      const serviceContext = await createContext(context);
      const detail = await services.getWhatsappCampaignDetail(serviceContext, {
        campaignId: params.data.campaignId,
      });
      return context.json(detail);
    }),
  );

  crmFeature.post("/whatsapp/campaigns", async (context) =>
    handleWhatsapp(context, async () => {
      const input = await parseWhatsappJson(
        context,
        whatsappCreateCampaignSchema,
      );
      const serviceContext = await createContext(context);
      const campaign = await services.createWhatsappCampaign(serviceContext, {
        content: input.content,
        initialTagId: input.initialTagId ?? null,
        ...(input.intervalMinutes
          ? { intervalMinutes: input.intervalMinutes }
          : {}),
        name: input.name,
        recipients: input.recipients.map((recipient) => ({
          sessionId: recipient.sessionId,
          ...(recipient.variables ? { variables: recipient.variables } : {}),
        })),
        replyTagId: input.replyTagId ?? null,
        scheduledStartAt: new Date(input.scheduledStartAt),
        secondaryContent: input.secondaryContent ?? null,
        ...(input.secondaryDelayMinutes
          ? { secondaryDelayMinutes: input.secondaryDelayMinutes }
          : {}),
      });
      return context.json(campaign, 201);
    }),
  );

  registerCampaignAction(crmFeature, "cancel", services, createContext);
  registerCampaignAction(crmFeature, "pause", services, createContext);
  registerCampaignAction(crmFeature, "resume", services, createContext);
}

function registerCampaignAction(
  crmFeature: Hono,
  action: "cancel" | "pause" | "resume",
  services: CrmServices,
  createContext: (context: Context) => Promise<ServiceContext>,
) {
  crmFeature.post(
    `/whatsapp/campaigns/:campaignId/${action}`,
    async (context) =>
      handleWhatsapp(context, async () => {
        const params = whatsappCampaignParamSchema.safeParse(
          context.req.param(),
        );
        if (!params.success) throw new CrmWhatsappValidationError();
        const serviceContext = await createContext(context);
        const method =
          action === "cancel"
            ? services.cancelWhatsappCampaign
            : action === "pause"
              ? services.pauseWhatsappCampaign
              : services.resumeWhatsappCampaign;
        const campaign = await method(serviceContext, {
          campaignId: params.data.campaignId,
        });
        return context.json(campaign);
      }),
  );
}
