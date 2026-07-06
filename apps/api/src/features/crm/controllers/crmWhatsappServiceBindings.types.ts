import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappCatalogProductsPage } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageScope,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type {
  UpdateWhatsappConnectionInput,
  WhatsappConnection,
} from "../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";
import type { UpdateWhatsappBotIntegrationInput } from "../../../domains/crm/services/CrmWhatsapp/whatsappBotIntegration.js";
import type { CrmBotIntegration } from "../../../domains/crm/ports/crmBotIntegrationRepository.js";
import type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../../domains/crm/services/CrmWhatsapp/ingestZapiWhatsappWebhook.js";
import type { ListWhatsappMessagesInput } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappMessages.js";
import type {
  CountWhatsappSessionsInput,
  WhatsappSessionCounts,
} from "../../../domains/crm/services/CrmWhatsapp/countWhatsappSessions.js";
import type { ListWhatsappSessionsInput } from "../../../domains/crm/services/CrmWhatsapp/listWhatsappSessions.js";
import type {
  ListWhatsappCatalogProductsInput,
  SendWhatsappCatalogProductInput,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappCatalogProducts.js";
import type { SendWhatsappCatalogInput } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappCatalog.js";
import type { SendWhatsappLocationInput } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappStructuredMessage.js";
import type { SendWhatsappMediaInput } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappMedia.js";
import type { SendWhatsappVehicleInput } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappVehicle.js";
import type {
  StartWhatsappConversationInput,
  StartWhatsappConversationResult,
} from "../../../domains/crm/services/CrmWhatsapp/startWhatsappConversation.js";
import type { SendWhatsappTextInput } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import type {
  DeleteWhatsappMessageInput,
  RemoveWhatsappReactionInput,
  SendWhatsappReactionInput,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappMessageActions.js";
import type {
  ListWhatsappWebhookEventIssuesInput,
  RetryWhatsappWebhookEventInput,
  RetryWhatsappWebhookEventResult,
  WhatsappWebhookEventSummary,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappWebhookEvents.js";
import type {
  CancelWhatsappScheduledMessageInput,
  CreateWhatsappScheduledMessageInput,
  ListDueWhatsappScheduledMessageScopesInput,
  ListWhatsappScheduledMessagesInput,
  ProcessDueWhatsappScheduledMessagesInput,
  ProcessDueWhatsappScheduledMessagesResult,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappScheduledMessages.js";
import type {
  AddWhatsappSessionTagInput,
  CreateWhatsappTagInput,
  DeleteWhatsappTagInput,
  ListWhatsappTagsInput,
  ReorderWhatsappTagsInput,
  RemoveWhatsappSessionTagInput,
  UpdateWhatsappTagInput,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappSessionTags.js";
import type {
  AssignWhatsappSessionInput,
  CloseWhatsappSessionInput,
  ToggleWhatsappInterventionInput,
} from "../../../domains/crm/services/CrmWhatsapp/updateWhatsappSession.js";
import type { MarkWhatsappSessionReadInput } from "../../../domains/crm/services/CrmWhatsapp/markWhatsappSessionRead.js";
import type {
  WhatsappMessage,
  WhatsappSession,
  WhatsappSessionTag,
} from "../../../domains/crm/whatsapp/whatsappModels.js";
import type { CrmWhatsappQuickMessageServices } from "./crmWhatsappQuickMessageBindings.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type ZapiWebhookProcessor = CrmContextService<
  IngestZapiWhatsappWebhookInput,
  unknown
>;

export type CrmWhatsappServices = CrmWhatsappQuickMessageServices & {
  addWhatsappSessionTag: CrmContextService<
    AddWhatsappSessionTagInput,
    WhatsappSession
  >;
  assignWhatsappSession: CrmContextService<
    AssignWhatsappSessionInput,
    WhatsappSession
  >;
  closeWhatsappSession: CrmContextService<
    CloseWhatsappSessionInput,
    WhatsappSession
  >;
  cancelWhatsappScheduledMessage: CrmContextService<
    CancelWhatsappScheduledMessageInput,
    CrmWhatsappScheduledMessage
  >;
  countWhatsappSessions: CrmContextService<
    CountWhatsappSessionsInput,
    WhatsappSessionCounts
  >;
  createWhatsappScheduledMessage: CrmContextService<
    CreateWhatsappScheduledMessageInput,
    CrmWhatsappScheduledMessage
  >;
  createWhatsappTag: CrmContextService<
    CreateWhatsappTagInput,
    WhatsappSessionTag
  >;
  deleteWhatsappTag: CrmContextService<
    DeleteWhatsappTagInput,
    WhatsappSessionTag
  >;
  deleteWhatsappMessage: CrmContextService<
    DeleteWhatsappMessageInput,
    WhatsappMessage
  >;
  ingestZapiWhatsappWebhook: CrmContextService<
    IngestZapiWhatsappWebhookInput,
    IngestZapiWhatsappWebhookResult
  >;
  listWhatsappCatalogProducts: CrmContextService<
    ListWhatsappCatalogProductsInput,
    CrmWhatsappCatalogProductsPage & { catalogPhone: string }
  >;
  listWhatsappConnections: (
    context: ServiceContext,
  ) => Promise<readonly WhatsappConnection[]>;
  getWhatsappBotIntegration: (
    context: ServiceContext,
  ) => Promise<CrmBotIntegration>;
  updateWhatsappBotIntegration: CrmContextService<
    UpdateWhatsappBotIntegrationInput,
    CrmBotIntegration
  >;
  updateWhatsappConnection: CrmContextService<
    UpdateWhatsappConnectionInput,
    WhatsappConnection
  >;
  listWhatsappWebhookEventIssues: CrmContextService<
    ListWhatsappWebhookEventIssuesInput,
    readonly WhatsappWebhookEventSummary[]
  >;
  listWhatsappMessages: CrmContextService<
    ListWhatsappMessagesInput,
    readonly WhatsappMessage[]
  >;
  listWhatsappSessions: CrmContextService<
    ListWhatsappSessionsInput,
    readonly WhatsappSession[]
  >;
  listWhatsappScheduledMessages: CrmContextService<
    ListWhatsappScheduledMessagesInput,
    readonly CrmWhatsappScheduledMessage[]
  >;
  listDueWhatsappScheduledMessageScopes: CrmContextService<
    ListDueWhatsappScheduledMessageScopesInput,
    readonly CrmWhatsappScheduledMessageScope[]
  >;
  listWhatsappTags: CrmContextService<
    ListWhatsappTagsInput,
    readonly WhatsappSessionTag[]
  >;
  markWhatsappSessionReadState: CrmContextService<
    MarkWhatsappSessionReadInput,
    WhatsappSession
  >;
  processZapiWhatsappChatPresenceWebhook: ZapiWebhookProcessor;
  processZapiWhatsappConnectedWebhook: ZapiWebhookProcessor;
  processZapiWhatsappDeliveryWebhook: ZapiWebhookProcessor;
  processZapiWhatsappDisconnectedWebhook: ZapiWebhookProcessor;
  processZapiWhatsappStatusWebhook: ZapiWebhookProcessor;
  processDueWhatsappScheduledMessages: CrmContextService<
    ProcessDueWhatsappScheduledMessagesInput,
    ProcessDueWhatsappScheduledMessagesResult
  >;
  removeWhatsappReaction: CrmContextService<
    RemoveWhatsappReactionInput,
    WhatsappMessage
  >;
  removeWhatsappSessionTag: CrmContextService<
    RemoveWhatsappSessionTagInput,
    WhatsappSession
  >;
  reorderWhatsappTags: CrmContextService<
    ReorderWhatsappTagsInput,
    readonly WhatsappSessionTag[]
  >;
  retryWhatsappWebhookEvent: CrmContextService<
    RetryWhatsappWebhookEventInput,
    RetryWhatsappWebhookEventResult
  >;
  sendWhatsappCatalog: CrmContextService<
    SendWhatsappCatalogInput,
    WhatsappMessage
  >;
  sendWhatsappCatalogProduct: CrmContextService<
    SendWhatsappCatalogProductInput,
    WhatsappMessage
  >;
  sendWhatsappLocation: CrmContextService<
    SendWhatsappLocationInput,
    WhatsappMessage
  >;
  sendWhatsappMedia: CrmContextService<SendWhatsappMediaInput, WhatsappMessage>;
  sendWhatsappReaction: CrmContextService<
    SendWhatsappReactionInput,
    WhatsappMessage
  >;
  sendWhatsappText: CrmContextService<SendWhatsappTextInput, WhatsappMessage>;
  sendWhatsappVehicle: CrmContextService<
    SendWhatsappVehicleInput,
    WhatsappMessage
  >;
  startWhatsappConversation: CrmContextService<
    StartWhatsappConversationInput,
    StartWhatsappConversationResult
  >;
  toggleWhatsappIntervention: CrmContextService<
    ToggleWhatsappInterventionInput,
    WhatsappSession
  >;
  updateWhatsappTag: CrmContextService<
    UpdateWhatsappTagInput,
    WhatsappSessionTag
  >;
};
