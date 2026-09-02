import type {
  CrmConnectionOverview,
  CrmExternalBotConfigurationPatchInput,
  CrmExternalBotConfigurationRead,
} from "@lojaveiculosv2/shared";
import type { ProductCrmAuth } from "./productCrmTypes";
import type {
  CrmRoutingPolicy,
  UpdateCrmRoutingPolicyInput,
} from "./crmRoutingTypes";
import type {
  CrmStatisticsQuery,
  CrmStatisticsResponse,
} from "./crmStatisticsTypes";

/** Response contract of POST /crm/channel-connections/:id/olx-chat/setup/retry. */
export type CrmOlxChatSetupRetryResult = {
  channel: "olx_chat";
  connectionId: string;
  diagnostics: {
    httpStatus: number;
    providerRequestId: string | null;
    retryable: boolean;
  };
  provider: "olx";
  readiness: { ready: boolean };
  setup: {
    attemptCount: number;
    configuredAt: string;
    status: string;
  };
};
import type {
  CrmCampaign,
  CrmCampaignDetail,
  CrmCreateCampaignInput,
  CrmListCampaignsInput,
} from "./crmCampaignTypes";
import type {
  CrmAddConversationCycleTagInput,
  CrmAssignConversationCycleInput,
  CrmWhatsappCatalogProductsPage,
  CrmCreateQuickMessageInput,
  CrmCreateScheduledMessageInput,
  CrmCreateTagInput,
  CrmWhatsappListCatalogProductsInput,
  CrmListScheduledMessagesInput,
  CrmListTagsInput,
  CrmConnectionId,
  CrmConnectionMember,
  CrmConnectionMemberRevokeResult,
  CrmInterventionInput,
  CrmMessageQuery,
  CrmMessage,
  CrmComposioAuthorization,
  CrmComposioCompleteResult,
  CrmConclusionInput,
  CrmCreateConnectionInput,
  CrmProviderConnection,
  CrmProviderEventsResponse,
  CrmQuickMessage,
  CrmProcessDueScheduledMessagesInput,
  CrmProcessDueScheduledMessagesResult,
  CrmRealtimeEvent,
  CrmRealtimeStatus,
  CrmReorderTagsInput,
  CrmRetryProviderEventResponse,
  CrmWhatsappSendLocationInput,
  CrmSendMediaInput,
  CrmWhatsappSendCatalogInput,
  CrmWhatsappSendCatalogProductInput,
  CrmSendQuickMessageInput,
  CrmSendReactionInput,
  CrmSendTextInput,
  CrmWhatsappSendVehicleInput,
  CrmConversationCycle,
  CrmConversationCycleCounts,
  CrmConversationCycleCountsQuery,
  CrmConversationCycleId,
  CrmConversationCycleQuery,
  CrmConversationCycleCommandInput,
  CrmConversationCycleCommandResult,
  CrmScheduledMessage,
  CrmStartConversationInput,
  CrmStartConversationResult,
  CrmTag,
  CrmUpdateTagInput,
  CrmUpdateQuickMessageInput,
  CrmUpdateScheduledMessageInput,
  CrmWhatsappZapiPairingCode,
  CrmWhatsappZapiPairingQr,
  CrmZapiCredentialsInput,
  CrmZapiReplacementInput,
  CrmZapiReplacementResult,
  CrmWhatsappZapiWebhookSetupResult,
  CrmUazapiInstanceSummary,
  CrmUazapiListInstancesInput,
} from "./crmConversationTypes";

export type CrmConversationApi = {
  getStatistics: (
    input: CrmStatisticsQuery,
    options?: { signal?: AbortSignal },
  ) => Promise<CrmStatisticsResponse>;
  archiveCycle: (
    cycleId: CrmConversationCycleId,
    input: CrmConversationCycleCommandInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  pinCycle: (
    cycleId: CrmConversationCycleId,
    input: CrmConversationCycleCommandInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  deleteCycle: (
    cycleId: CrmConversationCycleId,
    input: CrmConversationCycleCommandInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  assignCycle: (
    cycleId: CrmConversationCycleId,
    input: CrmAssignConversationCycleInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  closeCycle: (
    cycleId: CrmConversationCycleId,
    input: CrmConversationCycleCommandInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  concludeCycle: (
    cycleId: CrmConversationCycleId,
    input: CrmConclusionInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  authorizeComposioConnection: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmComposioAuthorization>;
  completeComposioConnection: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmComposioCompleteResult>;
  createConnection: (
    input: CrmCreateConnectionInput,
  ) => Promise<CrmProviderConnection>;
  disconnectZapiConnection: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  disconnectUazapiConnection: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  listUazapiInstances: (
    input: CrmUazapiListInstancesInput,
  ) => Promise<readonly CrmUazapiInstanceSummary[]>;
  grantConnectionMember: (
    connectionId: CrmConnectionId,
    userId: string,
  ) => Promise<void>;
  listConnectionMembers: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmConnectionMember[]>;
  repairZapiConnectionCredentials: (
    connectionId: CrmConnectionId,
    input: CrmZapiCredentialsInput,
  ) => Promise<CrmProviderConnection>;
  replaceZapiConnection: (
    connectionId: CrmConnectionId,
    input: CrmZapiReplacementInput,
  ) => Promise<CrmZapiReplacementResult>;
  getZapiReplacementStatus: (
    connectionId: CrmConnectionId,
    operationId: string,
  ) => Promise<CrmZapiReplacementResult>;
  deleteMessage: (messageId: CrmMessage["id"]) => Promise<CrmMessage | null>;
  updateCycleAttendance: (
    cycleId: CrmConversationCycleId,
    input: CrmInterventionInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  getBotIntegration: () => Promise<CrmExternalBotConfigurationRead>;
  getRoutingPolicy: () => Promise<CrmRoutingPolicy>;
  listConnections: () => Promise<CrmConnectionOverview>;
  listMessages: (
    cycleId: CrmConversationCycleId,
    query?: Omit<CrmMessageQuery, "connectionId">,
    options?: { signal?: AbortSignal },
  ) => Promise<CrmMessage[]>;
  listConversationCycleCounts: (
    query?: CrmConversationCycleCountsQuery,
  ) => Promise<CrmConversationCycleCounts>;
  listConversationCycles: (
    query?: CrmConversationCycleQuery,
  ) => Promise<CrmConversationCycle[]>;
  markCycleRead: (
    cycleId: CrmConversationCycleId,
    input: CrmConversationCycleCommandInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  markCycleUnread: (
    cycleId: CrmConversationCycleId,
    input: CrmConversationCycleCommandInput,
  ) => Promise<CrmConversationCycleCommandResult>;
  removeReaction: (messageId: CrmMessage["id"]) => Promise<CrmMessage | null>;
  requestZapiPairingCode: (
    connectionId: CrmConnectionId,
    phone: string,
  ) => Promise<CrmWhatsappZapiPairingCode>;
  requestZapiPairingQr: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmWhatsappZapiPairingQr>;
  refreshZapiConnectionStatus: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  refreshUazapiConnectionStatus: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmProviderConnection>;
  requestUazapiPairingCode: (
    connectionId: CrmConnectionId,
    phone: string,
  ) => Promise<CrmWhatsappZapiPairingCode>;
  requestUazapiPairingQr: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmWhatsappZapiPairingQr>;
  revokeConnectionMember: (
    connectionId: CrmConnectionId,
    userId: string,
  ) => Promise<CrmConnectionMemberRevokeResult>;
  retryOlxChatSetup: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmOlxChatSetupRetryResult>;
  setConnectionPaused?: (
    connectionId: CrmConnectionId,
    paused: boolean,
  ) => Promise<CrmProviderConnection>;
  configureZapiWebhooks: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmWhatsappZapiWebhookSetupResult>;
  configureUazapiWebhooks: (
    connectionId: CrmConnectionId,
  ) => Promise<CrmWhatsappZapiWebhookSetupResult>;
  selectComposioSender: (
    connectionId: CrmConnectionId,
    senderId: string,
  ) => Promise<CrmProviderConnection>;
  sendMedia: (input: CrmSendMediaInput) => Promise<CrmMessage>;
  sendReaction: (
    messageId: CrmMessage["id"],
    input: CrmSendReactionInput,
  ) => Promise<CrmMessage>;
  sendText: (input: CrmSendTextInput) => Promise<CrmMessage>;
  startConversation: (
    input: CrmStartConversationInput,
  ) => Promise<CrmStartConversationResult>;
  subscribeEvents: (input: {
    connectionId?: CrmConnectionId | null;
    onError?: (error: Error) => void;
    onEvent: (event: CrmRealtimeEvent) => void;
    onStatus?: (status: CrmRealtimeStatus) => void;
  }) => () => void;
  updateBotIntegration: (
    input: CrmExternalBotConfigurationPatchInput,
  ) => Promise<CrmExternalBotConfigurationRead>;
  updateRoutingPolicy: (
    input: UpdateCrmRoutingPolicyInput,
  ) => Promise<CrmRoutingPolicy>;
} & CrmConversationExtrasApi;

export type CrmConversationExtrasApi = {
  addCycleTag: (
    cycleId: CrmConversationCycleId,
    input: CrmAddConversationCycleTagInput,
  ) => Promise<CrmConversationCycle | null>;
  cancelScheduledMessage: (
    scheduledMessageId: string,
  ) => Promise<CrmScheduledMessage | null>;
  createQuickMessage: (
    input: CrmCreateQuickMessageInput,
  ) => Promise<CrmQuickMessage>;
  createScheduledMessage: (
    input: CrmCreateScheduledMessageInput,
  ) => Promise<CrmScheduledMessage>;
  createCampaign: (input: CrmCreateCampaignInput) => Promise<CrmCampaign>;
  createTag: (input: CrmCreateTagInput) => Promise<CrmTag>;
  deleteQuickMessage: (
    quickMessageId: string,
  ) => Promise<CrmQuickMessage | null>;
  deleteTag: (tagId: string) => Promise<CrmTag | null>;
  listCatalogProducts: (
    input: CrmWhatsappListCatalogProductsInput,
  ) => Promise<CrmWhatsappCatalogProductsPage>;
  listProviderEventIssues: () => Promise<CrmProviderEventsResponse>;
  listQuickMessages: () => Promise<CrmQuickMessage[]>;
  listScheduledMessages: (
    input?: CrmListScheduledMessagesInput,
  ) => Promise<CrmScheduledMessage[]>;
  listCampaigns: (input?: CrmListCampaignsInput) => Promise<CrmCampaign[]>;
  getCampaign: (campaignId: string) => Promise<CrmCampaignDetail>;
  listTags: (input?: CrmListTagsInput) => Promise<CrmTag[]>;
  processDueScheduledMessages: (
    input?: CrmProcessDueScheduledMessagesInput,
  ) => Promise<CrmProcessDueScheduledMessagesResult>;
  updateScheduledMessage: (
    scheduledMessageId: string,
    input: CrmUpdateScheduledMessageInput,
  ) => Promise<CrmScheduledMessage>;
  cancelCampaign: (campaignId: string) => Promise<CrmCampaign>;
  pauseCampaign: (campaignId: string) => Promise<CrmCampaign>;
  removeCycleTag: (
    cycleId: CrmConversationCycleId,
    tagId: string,
  ) => Promise<CrmConversationCycle | null>;
  reorderTags: (input: CrmReorderTagsInput) => Promise<CrmTag[]>;
  retryProviderEvent: (
    eventId: string,
  ) => Promise<CrmRetryProviderEventResponse>;
  resumeCampaign: (campaignId: string) => Promise<CrmCampaign>;
  sendCatalog: (input: CrmWhatsappSendCatalogInput) => Promise<CrmMessage>;
  sendCatalogProduct: (
    input: CrmWhatsappSendCatalogProductInput,
  ) => Promise<CrmMessage>;
  sendLocation: (input: CrmWhatsappSendLocationInput) => Promise<CrmMessage>;
  sendQuickMessage: (input: CrmSendQuickMessageInput) => Promise<CrmMessage>;
  sendVehicle: (input: CrmWhatsappSendVehicleInput) => Promise<CrmMessage>;
  updateQuickMessage: (
    quickMessageId: string,
    input: CrmUpdateQuickMessageInput,
  ) => Promise<CrmQuickMessage>;
  updateTag: (tagId: string, input: CrmUpdateTagInput) => Promise<CrmTag>;
};

export type CreateCrmConversationApiOptions = {
  auth?: ProductCrmAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};
