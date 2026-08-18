import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import {
  crmCampaignParamSchema,
  crmCampaignsQuerySchema,
  crmCreateCampaignSchema,
} from "./crm.campaigns.schemas.js";
import type { CrmServices } from "./crmServices.js";

type RegisterCrmCampaignRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  services: CrmServices;
};

export function registerCrmCampaignRoutes(
  crmFeature: Hono,
  { createContext, services }: RegisterCrmCampaignRoutesOptions,
) {
  crmFeature.get("/campaigns", async (context) =>
    handleCrmMessaging(context, async () => {
      const parsed = crmCampaignsQuerySchema.safeParse(context.req.query());
      if (!parsed.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      const campaigns = await services.listCrmCampaigns(serviceContext, {
        limit: parsed.data.limit,
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      });
      return context.json(campaigns);
    }),
  );

  crmFeature.get("/campaigns/:campaignId", async (context) =>
    handleCrmMessaging(context, async () => {
      const params = crmCampaignParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      const detail = await services.getCrmCampaignDetail(serviceContext, {
        campaignId: params.data.campaignId,
      });
      return context.json(detail);
    }),
  );

  crmFeature.post("/campaigns", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmCreateCampaignSchema,
      );
      const serviceContext = await createContext(context);
      const campaign = await services.createCrmCampaign(serviceContext, {
        content: input.content,
        initialTagId: input.initialTagId ?? null,
        ...(input.intervalMinutes
          ? { intervalMinutes: input.intervalMinutes }
          : {}),
        name: input.name,
        recipients: input.recipients.map((recipient) => ({
          cycleId: recipient.cycleId,
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
  crmFeature.post(`/campaigns/:campaignId/${action}`, async (context) =>
    handleCrmMessaging(context, async () => {
      const params = crmCampaignParamSchema.safeParse(context.req.param());
      if (!params.success) throw new CrmMessagingValidationError();
      const serviceContext = await createContext(context);
      const method =
        action === "cancel"
          ? services.cancelCrmCampaign
          : action === "pause"
            ? services.pauseCrmCampaign
            : services.resumeCrmCampaign;
      const campaign = await method(serviceContext, {
        campaignId: params.data.campaignId,
      });
      return context.json(campaign);
    }),
  );
}
