import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappCatalogProductsPage } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageScope,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
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
import type { WhatsappSessionCommandResponse } from "../../../domains/crm/services/CrmWhatsapp/executeWhatsappSessionCommand.js";
import type {
  WhatsappMessage,
  WhatsappSession,
  WhatsappSessionTag,
} from "../../../domains/crm/whatsapp/whatsappModels.js";
import type { CrmWhatsappCampaignServices } from "./crmWhatsappCampaignBindings.js";
import type { CrmWhatsappQuickMessageServices } from "./crmWhatsappQuickMessageBindings.js";
import type { CrmWhatsappWebhookServices } from "./crmWhatsappWebhookServiceTypes.js";
import type { CrmWhatsappConnectionServices } from "./crmWhatsappConnectionServiceTypes.js";
import type {
  RecoverOlxWebhookEffectsInput,
  RecoverOlxWebhookEffectsResult,
} from "../../../domains/crm/services/CrmMessaging/recoverOlxWebhookEffects.js";
import type { RecoverOlxLeadWebhooksResult } from "../../../domains/crm/services/CrmMessaging/recoverOlxLeadWebhooks.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type CrmWhatsappServices = CrmWhatsappQuickMessageServices &
  CrmWhatsappCampaignServices &
  CrmWhatsappWebhookServices &
  CrmWhatsappConnectionServices & {
    addWhatsappSessionTag: CrmContextService<
      AddWhatsappSessionTagInput,
      WhatsappSession
    >;
    assignWhatsappSession: CrmContextService<
      AssignWhatsappSessionInput,
      WhatsappSessionCommandResponse
    >;
    closeWhatsappSession: CrmContextService<
      CloseWhatsappSessionInput,
      WhatsappSessionCommandResponse
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
    listWhatsappCatalogProducts: CrmContextService<
      ListWhatsappCatalogProductsInput,
      CrmWhatsappCatalogProductsPage & { catalogPhone: string }
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
      WhatsappSessionCommandResponse
    >;
    processDueWhatsappScheduledMessages: CrmContextService<
      ProcessDueWhatsappScheduledMessagesInput,
      ProcessDueWhatsappScheduledMessagesResult
    >;
    recoverOlxWebhookEffects: CrmContextService<
      RecoverOlxWebhookEffectsInput,
      RecoverOlxWebhookEffectsResult
    >;
    recoverOlxLeadWebhooks: CrmContextService<
      { limit: number; now?: Date },
      RecoverOlxLeadWebhooksResult
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
    sendWhatsappMedia: CrmContextService<
      SendWhatsappMediaInput,
      WhatsappMessage
    >;
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
      WhatsappSessionCommandResponse
    >;
    updateWhatsappTag: CrmContextService<
      UpdateWhatsappTagInput,
      WhatsappSessionTag
    >;
  };
