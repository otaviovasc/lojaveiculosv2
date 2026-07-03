import type { Context, Hono } from "hono";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { registerCrmWhatsappRealtimeRoutes } from "./crm.whatsapp.realtimeRoutes.js";
import { registerCrmWhatsappApiRoutes } from "./crm.whatsapp.routes.js";
import type { CrmServices } from "./crmServices.js";

export type RegisterCrmWhatsappRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createWebhookContext?: (context: Context) => Promise<ServiceContext>;
  realtimeBroker?: CrmRealtimeBroker;
  services: CrmServices;
};

export function registerCrmWhatsappRoutes(
  crmFeature: Hono,
  options: RegisterCrmWhatsappRoutesOptions,
) {
  registerCrmWhatsappApiRoutes(crmFeature, options);
  registerCrmWhatsappRealtimeRoutes(crmFeature, options);
}
