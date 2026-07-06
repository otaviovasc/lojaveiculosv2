import { ingestZapiWhatsappWebhook } from "../../../domains/crm/services/CrmWhatsapp/ingestZapiWhatsappWebhook.js";
import {
  processZapiWhatsappChatPresenceWebhook,
  processZapiWhatsappConnectedWebhook,
  processZapiWhatsappDisconnectedWebhook,
} from "../../../domains/crm/services/CrmWhatsapp/processZapiWhatsappConnectionWebhook.js";
import {
  processZapiWhatsappDeliveryWebhook,
  processZapiWhatsappStatusWebhook,
} from "../../../domains/crm/services/CrmWhatsapp/processZapiWhatsappMessageWebhook.js";
import { processZapiWhatsappWebhookEvent } from "../../../domains/crm/services/CrmWhatsapp/processZapiWhatsappWebhookEvent.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { CrmWhatsappServices } from "./crmWhatsappServiceBindings.types.js";

type WebhookBindings = Pick<
  CrmWhatsappServices,
  | "ingestZapiWhatsappWebhook"
  | "processZapiWhatsappChatPresenceWebhook"
  | "processZapiWhatsappConnectedWebhook"
  | "processZapiWhatsappDeliveryWebhook"
  | "processZapiWhatsappDisconnectedWebhook"
  | "processZapiWhatsappStatusWebhook"
>;

export const buildWebhookBindings = (
  ports: CrmServicePorts,
): WebhookBindings => ({
  ingestZapiWhatsappWebhook: (context, input) =>
    processZapiWhatsappWebhookEvent(
      context,
      input,
      "received",
      ingestZapiWhatsappWebhook,
      ports,
    ),
  processZapiWhatsappChatPresenceWebhook: (context, input) =>
    processZapiWhatsappWebhookEvent(
      context,
      input,
      "chat_presence",
      processZapiWhatsappChatPresenceWebhook,
      ports,
    ),
  processZapiWhatsappConnectedWebhook: (context, input) =>
    processZapiWhatsappWebhookEvent(
      context,
      input,
      "connected",
      processZapiWhatsappConnectedWebhook,
      ports,
    ),
  processZapiWhatsappDeliveryWebhook: (context, input) =>
    processZapiWhatsappWebhookEvent(
      context,
      input,
      "delivery",
      processZapiWhatsappDeliveryWebhook,
      ports,
    ),
  processZapiWhatsappDisconnectedWebhook: (context, input) =>
    processZapiWhatsappWebhookEvent(
      context,
      input,
      "disconnected",
      processZapiWhatsappDisconnectedWebhook,
      ports,
    ),
  processZapiWhatsappStatusWebhook: (context, input) =>
    processZapiWhatsappWebhookEvent(
      context,
      input,
      "status",
      processZapiWhatsappStatusWebhook,
      ports,
    ),
});
