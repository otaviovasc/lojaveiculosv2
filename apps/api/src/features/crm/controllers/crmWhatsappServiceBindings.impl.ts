import { listWhatsappConnections } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";
import { ingestZapiWhatsappWebhook } from "../../../domains/crm/services/CrmWhatsapp/ingestZapiWhatsappWebhook.js";
import { listWhatsappMessages } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappMessages.js";
import { countWhatsappSessions } from "../../../domains/crm/services/CrmWhatsapp/countWhatsappSessions.js";
import { listWhatsappSessions } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappSessions.js";
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
import { sendWhatsappMedia } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappMedia.js";
import { sendWhatsappCatalog } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappCatalog.js";
import {
  listWhatsappCatalogProducts,
  sendWhatsappCatalogProduct,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappCatalogProducts.js";
import { sendWhatsappLocation } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappStructuredMessage.js";
import { sendWhatsappVehicle } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappVehicle.js";
import { sendWhatsappText } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import {
  deleteWhatsappMessage,
  removeWhatsappReaction,
  sendWhatsappReaction,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappMessageActions.js";
import {
  listWhatsappFailedWebhookEvents,
  retryWhatsappWebhookEvent,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappWebhookEvents.js";
import {
  addWhatsappSessionTag,
  listWhatsappTags,
  removeWhatsappSessionTag,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappSessionTags.js";
import {
  assignWhatsappSession,
  closeWhatsappSession,
  toggleWhatsappIntervention,
} from "../../../domains/crm/services/CrmWhatsapp/updateWhatsappSession.js";
import { markWhatsappSessionReadState } from "../../../domains/crm/services/CrmWhatsapp/markWhatsappSessionRead.js";
import { startWhatsappConversation } from "../../../domains/crm/services/CrmWhatsapp/startWhatsappConversation.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createCrmWhatsappQuickMessageBindings } from "./crmWhatsappQuickMessageBindings.js";
import type { CrmWhatsappServices } from "./crmWhatsappServiceBindings.types.js";

type CatalogBindings = Pick<
  CrmWhatsappServices,
  | "listWhatsappCatalogProducts"
  | "sendWhatsappCatalog"
  | "sendWhatsappCatalogProduct"
>;

type ConnectionBindings = Pick<CrmWhatsappServices, "listWhatsappConnections">;

type MessageBindings = Pick<
  CrmWhatsappServices,
  | "deleteWhatsappMessage"
  | "listWhatsappMessages"
  | "sendWhatsappLocation"
  | "sendWhatsappMedia"
  | "sendWhatsappReaction"
  | "sendWhatsappText"
  | "sendWhatsappVehicle"
>;

type SessionActionBindings = Pick<
  CrmWhatsappServices,
  | "assignWhatsappSession"
  | "closeWhatsappSession"
  | "countWhatsappSessions"
  | "listWhatsappSessions"
  | "markWhatsappSessionReadState"
  | "startWhatsappConversation"
  | "toggleWhatsappIntervention"
>;

type TagBindings = Pick<
  CrmWhatsappServices,
  "addWhatsappSessionTag" | "listWhatsappTags" | "removeWhatsappSessionTag"
>;

type WebhookBindings = Pick<
  CrmWhatsappServices,
  | "ingestZapiWhatsappWebhook"
  | "processZapiWhatsappChatPresenceWebhook"
  | "processZapiWhatsappConnectedWebhook"
  | "processZapiWhatsappDeliveryWebhook"
  | "processZapiWhatsappDisconnectedWebhook"
  | "processZapiWhatsappStatusWebhook"
>;

type WebhookEventBindings = Pick<
  CrmWhatsappServices,
  | "listWhatsappFailedWebhookEvents"
  | "removeWhatsappReaction"
  | "retryWhatsappWebhookEvent"
>;

const buildWebhookBindings = (ports: CrmServicePorts): WebhookBindings => ({
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

const buildCatalogBindings = (ports: CrmServicePorts): CatalogBindings => ({
  listWhatsappCatalogProducts: (context, input) =>
    listWhatsappCatalogProducts(context, input, ports),
  sendWhatsappCatalog: (context, input) =>
    sendWhatsappCatalog(context, input, ports),
  sendWhatsappCatalogProduct: (context, input) =>
    sendWhatsappCatalogProduct(context, input, ports),
});

const buildConnectionBindings = (
  ports: CrmServicePorts,
): ConnectionBindings => ({
  listWhatsappConnections: (context) => listWhatsappConnections(context, ports),
});

const buildMessageBindings = (ports: CrmServicePorts): MessageBindings => ({
  deleteWhatsappMessage: (context, input) =>
    deleteWhatsappMessage(context, input, ports),
  listWhatsappMessages: (context, input) =>
    listWhatsappMessages(context, input, ports),
  sendWhatsappLocation: (context, input) =>
    sendWhatsappLocation(context, input, ports),
  sendWhatsappMedia: (context, input) =>
    sendWhatsappMedia(context, input, ports),
  sendWhatsappReaction: (context, input) =>
    sendWhatsappReaction(context, input, ports),
  sendWhatsappText: (context, input) => sendWhatsappText(context, input, ports),
  sendWhatsappVehicle: (context, input) =>
    sendWhatsappVehicle(context, input, ports),
});

const buildSessionActionBindings = (
  ports: CrmServicePorts,
): SessionActionBindings => ({
  assignWhatsappSession: (context, input) =>
    assignWhatsappSession(context, input, ports),
  closeWhatsappSession: (context, input) =>
    closeWhatsappSession(context, input, ports),
  countWhatsappSessions: (context, input) =>
    countWhatsappSessions(context, input, ports),
  listWhatsappSessions: (context, input) =>
    listWhatsappSessions(context, input, ports),
  markWhatsappSessionReadState: (context, input) =>
    markWhatsappSessionReadState(context, input, ports),
  startWhatsappConversation: (context, input) =>
    startWhatsappConversation(context, input, ports),
  toggleWhatsappIntervention: (context, input) =>
    toggleWhatsappIntervention(context, input, ports),
});

const buildTagBindings = (ports: CrmServicePorts): TagBindings => ({
  addWhatsappSessionTag: (context, input) =>
    addWhatsappSessionTag(context, input, ports),
  listWhatsappTags: (context, input) => listWhatsappTags(context, input, ports),
  removeWhatsappSessionTag: (context, input) =>
    removeWhatsappSessionTag(context, input, ports),
});

const buildWebhookEventBindings = (
  ports: CrmServicePorts,
): WebhookEventBindings => ({
  listWhatsappFailedWebhookEvents: (context, input) =>
    listWhatsappFailedWebhookEvents(context, input, ports),
  retryWhatsappWebhookEvent: (context, input) =>
    retryWhatsappWebhookEvent(context, input, ports),
  removeWhatsappReaction: (context, input) =>
    removeWhatsappReaction(context, input, ports),
});

export function createCrmWhatsappServiceBindings(
  ports: CrmServicePorts,
): CrmWhatsappServices {
  return {
    ...buildConnectionBindings(ports),
    ...buildCatalogBindings(ports),
    ...buildMessageBindings(ports),
    ...buildSessionActionBindings(ports),
    ...buildTagBindings(ports),
    ...buildWebhookBindings(ports),
    ...buildWebhookEventBindings(ports),
    ...createCrmWhatsappQuickMessageBindings(ports),
  };
}
