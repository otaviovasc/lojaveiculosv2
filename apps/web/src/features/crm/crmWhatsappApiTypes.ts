import type { ProductCrmAuth } from "./productCrmTypes";
import type {
  CrmWhatsappBotIntegrationResponse,
  CrmWhatsappUpdateBotIntegrationInput,
} from "./crmWhatsappIntegrationTypes";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignDetail,
  CrmWhatsappCreateCampaignInput,
  CrmWhatsappListCampaignsInput,
} from "./crmWhatsappCampaignTypes";
import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappAssignSessionInput,
  CrmWhatsappCatalogProductsPage,
  CrmWhatsappCreateQuickMessageInput,
  CrmWhatsappCreateScheduledMessageInput,
  CrmWhatsappCreateTagInput,
  CrmWhatsappListCatalogProductsInput,
  CrmWhatsappListScheduledMessagesInput,
  CrmWhatsappListTagsInput,
  CrmWhatsappConnectionId,
  CrmWhatsappInterventionInput,
  CrmWhatsappMessageQuery,
  CrmWhatsappMessage,
  CrmWhatsappConnectionsResponse,
  CrmWhatsappUpdateConnectionInput,
  CrmWhatsappProviderConnection,
  CrmWhatsappProviderEventsResponse,
  CrmWhatsappQuickMessage,
  CrmWhatsappProcessDueScheduledMessagesInput,
  CrmWhatsappProcessDueScheduledMessagesResult,
  CrmWhatsappRealtimeEvent,
  CrmWhatsappReorderTagsInput,
  CrmWhatsappRetryProviderEventResponse,
  CrmWhatsappSendLocationInput,
  CrmWhatsappSendMediaInput,
  CrmWhatsappSendCatalogInput,
  CrmWhatsappSendCatalogProductInput,
  CrmWhatsappSendQuickMessageInput,
  CrmWhatsappSendReactionInput,
  CrmWhatsappSendTextInput,
  CrmWhatsappSendVehicleInput,
  CrmWhatsappSession,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionCountsQuery,
  CrmWhatsappSessionId,
  CrmWhatsappSessionQuery,
  CrmWhatsappScheduledMessage,
  CrmWhatsappStartConversationInput,
  CrmWhatsappStartConversationResult,
  CrmWhatsappTag,
  CrmWhatsappUpdateTagInput,
  CrmWhatsappUpdateQuickMessageInput,
} from "./crmWhatsappTypes";

export type CrmWhatsappApi = {
  assignSession: (
    sessionId: CrmWhatsappSessionId,
    input: CrmWhatsappAssignSessionInput,
  ) => Promise<CrmWhatsappSession | null>;
  closeSession: (
    sessionId: CrmWhatsappSessionId,
  ) => Promise<CrmWhatsappSession | null>;
  deleteMessage: (
    messageId: CrmWhatsappMessage["id"],
  ) => Promise<CrmWhatsappMessage | null>;
  interveneSession: (
    sessionId: CrmWhatsappSessionId,
    input: CrmWhatsappInterventionInput,
  ) => Promise<CrmWhatsappSession | null>;
  getBotIntegration: () => Promise<CrmWhatsappBotIntegrationResponse>;
  listConnections: () => Promise<CrmWhatsappConnectionsResponse>;
  listMessages: (
    sessionId: CrmWhatsappSessionId,
    query?: Omit<CrmWhatsappMessageQuery, "connectionId">,
  ) => Promise<CrmWhatsappMessage[]>;
  listSessionCounts: (
    query?: CrmWhatsappSessionCountsQuery,
  ) => Promise<CrmWhatsappSessionCounts>;
  listSessions: (
    query?: CrmWhatsappSessionQuery,
  ) => Promise<CrmWhatsappSession[]>;
  markSessionRead: (
    sessionId: CrmWhatsappSessionId,
  ) => Promise<CrmWhatsappSession | null>;
  markSessionUnread: (
    sessionId: CrmWhatsappSessionId,
  ) => Promise<CrmWhatsappSession | null>;
  removeReaction: (
    messageId: CrmWhatsappMessage["id"],
  ) => Promise<CrmWhatsappMessage | null>;
  sendMedia: (input: CrmWhatsappSendMediaInput) => Promise<CrmWhatsappMessage>;
  sendReaction: (
    messageId: CrmWhatsappMessage["id"],
    input: CrmWhatsappSendReactionInput,
  ) => Promise<CrmWhatsappMessage>;
  sendText: (input: CrmWhatsappSendTextInput) => Promise<CrmWhatsappMessage>;
  startConversation: (
    input: CrmWhatsappStartConversationInput,
  ) => Promise<CrmWhatsappStartConversationResult>;
  subscribeEvents: (input: {
    connectionId?: CrmWhatsappConnectionId | null;
    onError?: (error: Error) => void;
    onEvent: (event: CrmWhatsappRealtimeEvent) => void;
  }) => () => void;
  updateConnection: (
    connectionId: CrmWhatsappConnectionId,
    input: CrmWhatsappUpdateConnectionInput,
  ) => Promise<CrmWhatsappProviderConnection>;
  updateBotIntegration: (
    input: CrmWhatsappUpdateBotIntegrationInput,
  ) => Promise<CrmWhatsappBotIntegrationResponse>;
} & CrmWhatsappExtrasApi;

export type CrmWhatsappExtrasApi = {
  addSessionTag: (
    sessionId: CrmWhatsappSessionId,
    input: CrmWhatsappAddSessionTagInput,
  ) => Promise<CrmWhatsappSession | null>;
  cancelScheduledMessage: (
    scheduledMessageId: string,
  ) => Promise<CrmWhatsappScheduledMessage | null>;
  createQuickMessage: (
    input: CrmWhatsappCreateQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage>;
  createScheduledMessage: (
    input: CrmWhatsappCreateScheduledMessageInput,
  ) => Promise<CrmWhatsappScheduledMessage>;
  createCampaign: (
    input: CrmWhatsappCreateCampaignInput,
  ) => Promise<CrmWhatsappCampaign>;
  createTag: (input: CrmWhatsappCreateTagInput) => Promise<CrmWhatsappTag>;
  deleteQuickMessage: (
    quickMessageId: string,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  deleteTag: (tagId: string) => Promise<CrmWhatsappTag | null>;
  listCatalogProducts: (
    input: CrmWhatsappListCatalogProductsInput,
  ) => Promise<CrmWhatsappCatalogProductsPage>;
  listProviderEventIssues: () => Promise<CrmWhatsappProviderEventsResponse>;
  listQuickMessages: () => Promise<CrmWhatsappQuickMessage[]>;
  listScheduledMessages: (
    input?: CrmWhatsappListScheduledMessagesInput,
  ) => Promise<CrmWhatsappScheduledMessage[]>;
  listCampaigns: (
    input?: CrmWhatsappListCampaignsInput,
  ) => Promise<CrmWhatsappCampaign[]>;
  getCampaign: (campaignId: string) => Promise<CrmWhatsappCampaignDetail>;
  listTags: (input?: CrmWhatsappListTagsInput) => Promise<CrmWhatsappTag[]>;
  processDueScheduledMessages: (
    input?: CrmWhatsappProcessDueScheduledMessagesInput,
  ) => Promise<CrmWhatsappProcessDueScheduledMessagesResult>;
  cancelCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign>;
  pauseCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign>;
  removeSessionTag: (
    sessionId: CrmWhatsappSessionId,
    tagId: string,
  ) => Promise<CrmWhatsappSession | null>;
  reorderTags: (
    input: CrmWhatsappReorderTagsInput,
  ) => Promise<CrmWhatsappTag[]>;
  retryProviderEvent: (
    eventId: string,
  ) => Promise<CrmWhatsappRetryProviderEventResponse>;
  resumeCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign>;
  sendCatalog: (
    input: CrmWhatsappSendCatalogInput,
  ) => Promise<CrmWhatsappMessage>;
  sendCatalogProduct: (
    input: CrmWhatsappSendCatalogProductInput,
  ) => Promise<CrmWhatsappMessage>;
  sendLocation: (
    input: CrmWhatsappSendLocationInput,
  ) => Promise<CrmWhatsappMessage>;
  sendQuickMessage: (
    input: CrmWhatsappSendQuickMessageInput,
  ) => Promise<CrmWhatsappMessage>;
  sendVehicle: (
    input: CrmWhatsappSendVehicleInput,
  ) => Promise<CrmWhatsappMessage>;
  updateQuickMessage: (
    quickMessageId: string,
    input: CrmWhatsappUpdateQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage>;
  updateTag: (
    tagId: string,
    input: CrmWhatsappUpdateTagInput,
  ) => Promise<CrmWhatsappTag>;
};

export type CreateCrmWhatsappApiOptions = {
  auth?: ProductCrmAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};
