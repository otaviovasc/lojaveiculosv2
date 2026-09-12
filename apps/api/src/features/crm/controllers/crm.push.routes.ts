import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertConversationRead } from "./crm.messaging.controller.support.js";
import {
  CrmMessagingValidationError,
  handleCrmMessaging,
} from "./crm.messaging.errors.js";
import { parseCrmMessagingJson } from "./crm.messaging.controller.support.js";
import {
  crmPushPreferenceBodySchema,
  crmPushSubscriptionBodySchema,
  crmPushSubscriptionParamSchema,
} from "./crm.push.schemas.js";
import type { CrmServices } from "./crmServices.js";

export type CrmPushDeliveryMode = "live" | "off" | "shadow";

export type CrmPushPublicConfig = {
  appId: string | null;
  deliveryMode: CrmPushDeliveryMode;
};

type RegisterCrmPushRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  publicConfig: CrmPushPublicConfig;
  services: CrmServices;
};

export function registerCrmPushRoutes(
  crmFeature: Hono,
  { createContext, publicConfig, services }: RegisterCrmPushRoutesOptions,
) {
  crmFeature.get("/push/settings", async (context) =>
    handleCrmMessaging(context, async () => {
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      const settings = await services.getCrmPushSettings(serviceContext);
      return context.json({
        appId: publicConfig.appId,
        deliveryMode: publicConfig.deliveryMode,
        preference: { enabled: settings.preferenceEnabled },
        subscription: settings.subscription
          ? {
              enabled: settings.subscription.enabled,
              id: settings.subscription.subscriptionId,
            }
          : null,
      });
    }),
  );

  crmFeature.post("/push/subscriptions", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmPushSubscriptionBodySchema,
      );
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      await services.registerCrmPushSubscription(serviceContext, input);
      return context.body(null, 204);
    }),
  );

  crmFeature.delete("/push/subscriptions/:subscriptionId", async (context) =>
    handleCrmMessaging(context, async () => {
      const parsed = crmPushSubscriptionParamSchema.safeParse(
        context.req.param(),
      );
      if (!parsed.success) {
        throw new CrmMessagingValidationError(
          "OneSignal subscription ID is invalid.",
        );
      }
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      await services.disableCrmPushSubscription(serviceContext, parsed.data);
      return context.body(null, 204);
    }),
  );

  crmFeature.patch("/push/preferences", async (context) =>
    handleCrmMessaging(context, async () => {
      const input = await parseCrmMessagingJson(
        context,
        crmPushPreferenceBodySchema,
      );
      const serviceContext = await createContext(context);
      assertConversationRead(serviceContext);
      await services.setOwnCrmPushPreference(serviceContext, input);
      return context.body(null, 204);
    }),
  );
}
