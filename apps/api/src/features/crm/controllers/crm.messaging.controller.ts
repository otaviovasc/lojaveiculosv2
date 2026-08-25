import type { Context, Hono } from "hono";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { registerCrmMessagingRealtimeRoutes } from "./crm.messaging.realtimeRoutes.js";
import { registerCrmAttendanceRoutes } from "./crm.attendance.routes.js";
import { registerCrmMessagingApiRoutes } from "./crm.messaging.routes.js";
import type { CrmServices } from "./crmServices.js";
import type { CrmPushPublicConfig } from "./crm.push.routes.js";
import { registerCrmPushRoutes } from "./crm.push.routes.js";

export type RegisterCrmMessagingRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createSupportContext?: (context: Context) => Promise<ServiceContext>;
  createWebhookContext?: (context: Context) => Promise<ServiceContext>;
  realtimeBroker?: CrmRealtimeBroker;
  resolveBotEntitlements?: ResolveCrmBotEntitlements;
  pushPublicConfig: CrmPushPublicConfig;
  services: CrmServices;
};

export function registerCrmMessagingRoutes(
  crmFeature: Hono,
  options: RegisterCrmMessagingRoutesOptions,
) {
  registerCrmMessagingApiRoutes(crmFeature, options);
  registerCrmPushRoutes(crmFeature, {
    createContext: options.createContext,
    publicConfig: options.pushPublicConfig,
    services: options.services,
  });
  registerCrmAttendanceRoutes(crmFeature, options);
  registerCrmMessagingRealtimeRoutes(crmFeature, options);
}
