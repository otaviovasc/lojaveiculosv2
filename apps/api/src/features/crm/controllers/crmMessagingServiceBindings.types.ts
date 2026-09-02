import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappCatalogProductsPage } from "../../../domains/crm/ports/crmMessagingGateway.js";
import type {
  CrmConversationCycle,
  CrmMessage,
  CrmQueueVisibility,
  CrmScheduledMessage,
  CrmScheduledMessageScope,
  CrmTag,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import type { ListMessagesInput } from "../../../domains/crm/services/CrmMessagingService/listMessages.js";
import type {
  CountConversationCyclesInput,
  ConversationCycleCounts,
} from "../../../domains/crm/services/CrmMessagingService/countConversationCycles.js";
import type { ListConversationCyclesInput } from "../../../domains/crm/services/CrmMessagingService/listConversationCycles.js";
import type {
  ListWhatsappCatalogProductsInput,
  SendWhatsappCatalogProductInput,
} from "../../../domains/crm/services/CrmWhatsappService/whatsappCatalogProducts.js";
import type { SendWhatsappCatalogInput } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappCatalog.js";
import type { SendWhatsappLocationInput } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappStructuredMessage.js";
import type { SendCrmMediaMessageInput } from "../../../domains/crm/services/CrmMessagingService/sendCrmMediaMessage.js";
import type { SendWhatsappVehicleInput } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappVehicle.js";
import type {
  StartConversationInput as DomainStartConversationInput,
  StartConversationResult,
} from "../../../domains/crm/services/CrmMessagingService/startConversation.js";
import type {
  DeleteCrmMessageDtoInput,
  RemoveCrmReactionInput,
  SendCrmReactionInput,
} from "../../../domains/crm/services/CrmMessagingService/crmMessageActions.js";
import type {
  CancelCrmScheduledMessageInput,
  CreateCrmScheduledMessageInput,
  ListDueCrmScheduledMessageScopesInput,
  ListCrmScheduledMessagesInput,
  ProcessDueCrmScheduledMessagesInput,
  ProcessDueCrmScheduledMessagesResult,
  UpdateCrmScheduledMessageInput,
} from "../../../domains/crm/services/CrmMessagingService/crmScheduledMessages.js";
import type {
  AddConversationCycleTagInput,
  CreateCrmTagInput,
  DeleteCrmTagInput,
  ListCrmTagsInput,
  ReorderCrmTagsInput,
  RemoveConversationCycleTagInput,
  UpdateCrmTagInput,
} from "../../../domains/crm/services/CrmMessagingService/crmConversationCycleTags.js";
import type { AssignConversationCycleInput } from "../../../domains/crm/services/CrmMessagingService/updateCrmConversationCycle.js";
import type { CloseConversationCycleInput } from "../../../domains/crm/services/CrmMessagingService/closeConversationCycle.js";
import type { SetConversationAttendanceInput } from "../../../domains/crm/services/CrmMessagingService/setConversationAttendance.js";
import type { MarkConversationCycleReadInput } from "../../../domains/crm/services/CrmMessagingService/markCrmConversationCycleRead.js";
import type { ConversationCycleCommandResponse } from "../../../domains/crm/services/CrmMessagingService/executeCrmConversationCycleCommand.js";
import type { CrmCampaignServices } from "./crmCampaignBindings.js";
import type { CrmQuickMessageServices } from "./crmQuickMessageBindings.js";
import type { CrmWhatsappWebhookServices } from "./crmWhatsappWebhookServiceTypes.js";
import type { CrmChannelConnectionServices } from "./crmChannelConnectionServiceTypes.js";
import type {
  RecoverOlxWebhookEffectsInput,
  RecoverOlxWebhookEffectsResult,
} from "../../../domains/crm/services/CrmMessagingService/recoverOlxWebhookEffects.js";
import type { RecoverOlxLeadWebhooksResult } from "../../../domains/crm/services/CrmMessagingService/recoverOlxLeadWebhooks.js";
import type { CrmPushServices } from "./crmPushBindings.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type SendMessageInput = {
  action: "message.send_text";
  content: string;
  cycleId: string;
  idempotencyKey?: string;
  replyToMessageId?: string;
};

export type StartConversationInput = Omit<
  DomainStartConversationInput,
  "connectionId" | "phone"
> & {
  action: "message.send_template" | "message.send_text";
  channel: "instagram" | "olx_chat" | "whatsapp";
  recipientAddress?: string;
};

export type CrmMessagingServices = CrmQuickMessageServices &
  CrmCampaignServices &
  CrmWhatsappWebhookServices &
  CrmChannelConnectionServices & {
    addConversationCycleTag: CrmContextService<
      AddConversationCycleTagInput,
      CrmConversationCycle
    >;
    assignConversationCycle: CrmContextService<
      AssignConversationCycleInput,
      ConversationCycleCommandResponse
    >;
    closeConversationCycle: CrmContextService<
      CloseConversationCycleInput,
      ConversationCycleCommandResponse
    >;
    cancelCrmScheduledMessage: CrmContextService<
      CancelCrmScheduledMessageInput,
      CrmScheduledMessage
    >;
    countConversationCycles: CrmContextService<
      CountConversationCyclesInput,
      ConversationCycleCounts
    >;
    createCrmScheduledMessage: CrmContextService<
      CreateCrmScheduledMessageInput,
      CrmScheduledMessage
    >;
    createCrmTag: CrmContextService<CreateCrmTagInput, CrmTag>;
    deleteCrmTag: CrmContextService<DeleteCrmTagInput, CrmTag>;
    deleteMessage: CrmContextService<DeleteCrmMessageDtoInput, CrmMessage>;
    listWhatsappCatalogProducts: CrmContextService<
      ListWhatsappCatalogProductsInput,
      CrmWhatsappCatalogProductsPage & { catalogPhone: string }
    >;
    listMessages: CrmContextService<ListMessagesInput, readonly CrmMessage[]>;
    listConversationCycles: CrmContextService<
      ListConversationCyclesInput,
      readonly CrmConversationCycle[]
    >;
    listCrmScheduledMessages: CrmContextService<
      ListCrmScheduledMessagesInput,
      readonly CrmScheduledMessage[]
    >;
    listDueCrmScheduledMessageScopes: CrmContextService<
      ListDueCrmScheduledMessageScopesInput,
      readonly CrmScheduledMessageScope[]
    >;
    listCrmTags: CrmContextService<ListCrmTagsInput, readonly CrmTag[]>;
    markConversationCycleReadState: CrmContextService<
      MarkConversationCycleReadInput,
      ConversationCycleCommandResponse
    >;
    processDueCrmScheduledMessages: CrmContextService<
      ProcessDueCrmScheduledMessagesInput,
      ProcessDueCrmScheduledMessagesResult
    >;
    updateCrmScheduledMessage: CrmContextService<
      UpdateCrmScheduledMessageInput,
      CrmScheduledMessage
    >;
    recoverOlxWebhookEffects: CrmContextService<
      RecoverOlxWebhookEffectsInput,
      RecoverOlxWebhookEffectsResult
    >;
    recoverOlxLeadWebhooks: CrmContextService<
      { limit: number; now?: Date },
      RecoverOlxLeadWebhooksResult
    >;
    removeCrmReaction: CrmContextService<RemoveCrmReactionInput, CrmMessage>;
    resolveCrmQueueVisibility: (
      context: ServiceContext,
    ) => Promise<CrmQueueVisibility>;
    removeConversationCycleTag: CrmContextService<
      RemoveConversationCycleTagInput,
      CrmConversationCycle
    >;
    reorderCrmTags: CrmContextService<ReorderCrmTagsInput, readonly CrmTag[]>;
    sendWhatsappCatalog: CrmContextService<
      SendWhatsappCatalogInput,
      CrmMessage
    >;
    sendWhatsappCatalogProduct: CrmContextService<
      SendWhatsappCatalogProductInput,
      CrmMessage
    >;
    sendWhatsappLocation: CrmContextService<
      SendWhatsappLocationInput,
      CrmMessage
    >;
    sendMedia: CrmContextService<SendCrmMediaMessageInput, CrmMessage>;
    sendCrmReaction: CrmContextService<SendCrmReactionInput, CrmMessage>;
    sendMessage: CrmContextService<SendMessageInput, CrmMessage>;
    sendWhatsappVehicle: CrmContextService<
      SendWhatsappVehicleInput,
      CrmMessage
    >;
    startConversation: CrmContextService<
      StartConversationInput,
      StartConversationResult
    >;
    setConversationAttendance: CrmContextService<
      SetConversationAttendanceInput,
      ConversationCycleCommandResponse
    >;
    updateCrmTag: CrmContextService<UpdateCrmTagInput, CrmTag>;
  } & CrmPushServices;
