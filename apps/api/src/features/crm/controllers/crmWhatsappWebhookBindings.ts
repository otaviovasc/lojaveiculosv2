import { ingestZapiWhatsappWebhook } from "../../../domains/crm/services/CrmWhatsappService/ingestZapiWhatsappWebhook.js";
import {
  processZapiWhatsappChatPresenceWebhook,
  processZapiWhatsappConnectedWebhook,
  processZapiWhatsappDisconnectedWebhook,
} from "../../../domains/crm/services/CrmWhatsappService/processZapiWhatsappConnectionWebhook.js";
import {
  processZapiWhatsappDeliveryWebhook,
  processZapiWhatsappStatusWebhook,
} from "../../../domains/crm/services/CrmWhatsappService/processZapiWhatsappMessageWebhook.js";
import { processZapiWhatsappWebhookEvent } from "../../../domains/crm/services/CrmWhatsappService/processZapiWhatsappWebhookEvent.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { CrmMessagingServices } from "./crmMessagingServiceBindings.types.js";
import { processMetaMessagingWebhook } from "../../../domains/crm/services/CrmMessagingService/processMetaMessagingWebhook.js";
import { authorizeZapiWebhook } from "../../../domains/crm/services/CrmWhatsappService/authorizeZapiWebhook.js";
import { authorizeOlxChatWebhook } from "../../../domains/crm/services/CrmMessagingService/authorizeOlxChatWebhook.js";
import { ingestOlxChatWebhook } from "../../../domains/crm/services/CrmMessagingService/ingestOlxChatWebhook.js";
import { ingestOlxLeadWebhook } from "../../../domains/crm/services/CrmMessagingService/ingestOlxLeadWebhook.js";

type WebhookBindings = Pick<
  CrmMessagingServices,
  | "ingestZapiWhatsappWebhook"
  | "ingestOlxChatWebhook"
  | "ingestOlxLeadWebhook"
  | "authorizeOlxChatWebhook"
  | "authorizeZapiWebhook"
  | "processMetaMessagingWebhook"
  | "processZapiWhatsappChatPresenceWebhook"
  | "processZapiWhatsappConnectedWebhook"
  | "processZapiWhatsappDeliveryWebhook"
  | "processZapiWhatsappDisconnectedWebhook"
  | "processZapiWhatsappStatusWebhook"
>;

export const buildWebhookBindings = (
  ports: CrmServicePorts,
): WebhookBindings => ({
  authorizeOlxChatWebhook: (context, input) =>
    authorizeOlxChatWebhook(context, input, ports),
  authorizeZapiWebhook: (context, input) =>
    authorizeZapiWebhook(context, input, ports),
  processMetaMessagingWebhook: (context, input) =>
    processMetaMessagingWebhook(context, input, ports),
  ingestOlxChatWebhook: (context, input) =>
    ingestOlxChatWebhook(context, input, ports),
  ingestOlxLeadWebhook: (context, input) =>
    ingestOlxLeadWebhook(context, input, ports),
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
