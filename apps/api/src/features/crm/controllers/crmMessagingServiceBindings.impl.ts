import { listMessages } from "../../../domains/crm/services/CrmMessagingService/listMessages.js";
import { countConversationCycles } from "../../../domains/crm/services/CrmMessagingService/countConversationCycles.js";
import { listConversationCycles } from "../../../domains/crm/services/CrmMessagingService/listConversationCycles.js";
import { sendCrmMediaMessage } from "../../../domains/crm/services/CrmMessagingService/sendCrmMediaMessage.js";
import { sendWhatsappCatalog } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappCatalog.js";
import {
  listWhatsappCatalogProducts,
  sendWhatsappCatalogProduct,
} from "../../../domains/crm/services/CrmWhatsappService/whatsappCatalogProducts.js";
import { sendWhatsappLocation } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappStructuredMessage.js";
import { sendWhatsappVehicle } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappVehicle.js";
import { sendMessage } from "../../../domains/crm/services/CrmMessagingService/sendMessage.js";
import {
  deleteCrmMessageDto as deleteMessage,
  removeCrmReaction,
  sendCrmReaction,
} from "../../../domains/crm/services/CrmMessagingService/crmMessageActions.js";
import {
  listProviderEventIssues,
  retryProviderEvent,
} from "../../../domains/crm/services/CrmMessagingService/providerEventIssues.js";
import { recoverOlxWebhookEffects } from "../../../domains/crm/services/CrmMessagingService/recoverOlxWebhookEffects.js";
import { recoverOlxLeadWebhooks } from "../../../domains/crm/services/CrmMessagingService/recoverOlxLeadWebhooks.js";
import {
  cancelCrmScheduledMessage,
  createCrmScheduledMessage,
  listDueCrmScheduledMessageScopes,
  listCrmScheduledMessages,
  processDueCrmScheduledMessages,
} from "../../../domains/crm/services/CrmMessagingService/crmScheduledMessages.js";
import {
  addConversationCycleTag,
  listCrmTags,
  removeConversationCycleTag,
} from "../../../domains/crm/services/CrmMessagingService/crmConversationCycleTags.js";
import {
  createCrmTag,
  deleteCrmTag,
  reorderCrmTags,
  updateCrmTag,
} from "../../../domains/crm/services/CrmMessagingService/crmTagManagement.js";
import {
  assignConversationCycle,
  closeConversationCycle,
} from "../../../domains/crm/services/CrmMessagingService/updateCrmConversationCycle.js";
import { setConversationAttendance } from "../../../domains/crm/services/CrmMessagingService/setConversationAttendance.js";
import { markConversationCycleReadState } from "../../../domains/crm/services/CrmMessagingService/markCrmConversationCycleRead.js";
import { startConversation } from "../../../domains/crm/services/CrmMessagingService/startConversation.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createCrmQuickMessageBindings } from "./crmQuickMessageBindings.js";
import type { CrmMessagingServices } from "./crmMessagingServiceBindings.types.js";
import { createCrmCampaignBindings } from "./crmCampaignBindings.js";
import { buildWebhookBindings } from "./crmWhatsappWebhookBindings.js";
import { createCrmChannelConnectionBindings } from "./crmChannelConnectionBindings.js";

type CatalogBindings = Pick<
  CrmMessagingServices,
  | "listWhatsappCatalogProducts"
  | "sendWhatsappCatalog"
  | "sendWhatsappCatalogProduct"
>;

type MessageBindings = Pick<
  CrmMessagingServices,
  | "deleteMessage"
  | "listMessages"
  | "sendWhatsappLocation"
  | "sendMedia"
  | "sendCrmReaction"
  | "sendMessage"
  | "sendWhatsappVehicle"
>;

type CycleActionBindings = Pick<
  CrmMessagingServices,
  | "cancelCrmScheduledMessage"
  | "assignConversationCycle"
  | "closeConversationCycle"
  | "countConversationCycles"
  | "createCrmScheduledMessage"
  | "listDueCrmScheduledMessageScopes"
  | "listConversationCycles"
  | "listCrmScheduledMessages"
  | "markConversationCycleReadState"
  | "processDueCrmScheduledMessages"
  | "startConversation"
  | "setConversationAttendance"
>;

type TagBindings = Pick<
  CrmMessagingServices,
  | "addConversationCycleTag"
  | "createCrmTag"
  | "deleteCrmTag"
  | "listCrmTags"
  | "removeConversationCycleTag"
  | "reorderCrmTags"
  | "updateCrmTag"
>;

type WebhookEventBindings = Pick<
  CrmMessagingServices,
  | "listProviderEventIssues"
  | "recoverOlxWebhookEffects"
  | "recoverOlxLeadWebhooks"
  | "removeCrmReaction"
  | "retryProviderEvent"
>;

const buildCatalogBindings = (ports: CrmServicePorts): CatalogBindings => ({
  listWhatsappCatalogProducts: (context, input) =>
    listWhatsappCatalogProducts(context, input, ports),
  sendWhatsappCatalog: (context, input) =>
    sendWhatsappCatalog(context, input, ports),
  sendWhatsappCatalogProduct: (context, input) =>
    sendWhatsappCatalogProduct(context, input, ports),
});

const buildMessageBindings = (ports: CrmServicePorts): MessageBindings => ({
  deleteMessage: (context, input) => deleteMessage(context, input, ports),
  listMessages: (context, input) => listMessages(context, input, ports),
  sendWhatsappLocation: (context, input) =>
    sendWhatsappLocation(context, input, ports),
  sendMedia: (context, input) => sendCrmMediaMessage(context, input, ports),
  sendCrmReaction: (context, input) => sendCrmReaction(context, input, ports),
  sendMessage: (context, input) =>
    sendMessage(
      context,
      {
        ...(input.idempotencyKey
          ? { idempotencyKey: input.idempotencyKey }
          : {}),
        ...(input.replyToMessageId
          ? { replyToMessageId: input.replyToMessageId }
          : {}),
        cycleId: input.cycleId,
        text: input.content,
      },
      ports,
    ),
  sendWhatsappVehicle: (context, input) =>
    sendWhatsappVehicle(context, input, ports),
});

const buildCycleActionBindings = (
  ports: CrmServicePorts,
): CycleActionBindings => ({
  cancelCrmScheduledMessage: (context, input) =>
    cancelCrmScheduledMessage(context, input, ports),
  assignConversationCycle: (context, input) =>
    assignConversationCycle(context, input, ports),
  closeConversationCycle: (context, input) =>
    closeConversationCycle(context, input, ports),
  countConversationCycles: (context, input) =>
    countConversationCycles(context, input, ports),
  createCrmScheduledMessage: (context, input) =>
    createCrmScheduledMessage(context, input, ports),
  listDueCrmScheduledMessageScopes: (context, input) =>
    listDueCrmScheduledMessageScopes(context, input, ports),
  listConversationCycles: (context, input) =>
    listConversationCycles(context, input, ports),
  listCrmScheduledMessages: (context, input) =>
    listCrmScheduledMessages(context, input, ports),
  markConversationCycleReadState: (context, input) =>
    markConversationCycleReadState(context, input, ports),
  processDueCrmScheduledMessages: (context, input) =>
    processDueCrmScheduledMessages(context, input, ports),
  startConversation: (context, input) => {
    const { action: _action, recipientAddress, ...rest } = input;
    return startConversation(
      context,
      {
        ...rest,
        ...(recipientAddress ? { phone: recipientAddress } : {}),
      },
      ports,
    );
  },
  setConversationAttendance: (context, input) =>
    setConversationAttendance(context, input, ports),
});

const buildTagBindings = (ports: CrmServicePorts): TagBindings => ({
  addConversationCycleTag: (context, input) =>
    addConversationCycleTag(context, input, ports),
  createCrmTag: (context, input) => createCrmTag(context, input, ports),
  deleteCrmTag: (context, input) => deleteCrmTag(context, input, ports),
  listCrmTags: (context, input) => listCrmTags(context, input, ports),
  removeConversationCycleTag: (context, input) =>
    removeConversationCycleTag(context, input, ports),
  reorderCrmTags: (context, input) => reorderCrmTags(context, input, ports),
  updateCrmTag: (context, input) => updateCrmTag(context, input, ports),
});

const buildWebhookEventBindings = (
  ports: CrmServicePorts,
): WebhookEventBindings => ({
  listProviderEventIssues: (context, input) =>
    listProviderEventIssues(context, input, ports),
  retryProviderEvent: (context, input) =>
    retryProviderEvent(context, input, ports),
  recoverOlxWebhookEffects: (context, input) =>
    recoverOlxWebhookEffects(context, input, ports),
  recoverOlxLeadWebhooks: (context, input) =>
    recoverOlxLeadWebhooks(context, input, ports),
  removeCrmReaction: (context, input) =>
    removeCrmReaction(context, input, ports),
});

export function createCrmMessagingServiceBindings(
  ports: CrmServicePorts,
): CrmMessagingServices {
  return {
    ...createCrmChannelConnectionBindings(ports),
    ...buildCatalogBindings(ports),
    ...buildMessageBindings(ports),
    ...createCrmCampaignBindings(ports),
    ...buildCycleActionBindings(ports),
    ...buildTagBindings(ports),
    ...buildWebhookBindings(ports),
    ...buildWebhookEventBindings(ports),
    ...createCrmQuickMessageBindings(ports),
  };
}
