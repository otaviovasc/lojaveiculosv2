import type {
  CreateCrmWhatsappQuickMessageInput,
  CrmWhatsappQuickMessage,
  FindCrmWhatsappQuickMessageInput,
  ListCrmWhatsappQuickMessagesInput,
  UpdateCrmWhatsappQuickMessageInput,
} from "./crmWhatsappQuickMessageRepository.js";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignRecipient,
  CrmWhatsappMessage,
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageScope,
  CrmWhatsappSession,
  CrmWhatsappTag,
  IngestCrmWhatsappMessageResult,
} from "./crmWhatsappRepositoryModels.js";
import type {
  CountCrmWhatsappSessionsInput,
  CreateCrmWhatsappScheduledMessageInput,
  CreateCrmWhatsappTagInput,
  DeleteCrmWhatsappTagInput,
  FindCrmWhatsappMessageByExternalIdInput,
  FindCrmWhatsappMessageByIdInput,
  FindDueCrmWhatsappScheduledMessageScopesInput,
  FindDueCrmWhatsappScheduledMessagesInput,
  FindOrCreateCrmWhatsappTagInput,
  IngestCrmWhatsappMessageInput,
  ListCrmWhatsappMessagesInput,
  ListCrmWhatsappScheduledMessagesInput,
  ListCrmWhatsappSessionsInput,
  ListCrmWhatsappTagsInput,
  ReorderCrmWhatsappTagsInput,
  UpdateCrmWhatsappMessageInput,
  UpdateCrmWhatsappScheduledMessageInput,
  UpdateCrmWhatsappSessionInput,
  UpdateCrmWhatsappSessionTagInput,
  UpdateCrmWhatsappTagInput,
} from "./crmWhatsappRepositoryInputs.js";
import type {
  CreateCrmWhatsappCampaignInput,
  CreateCrmWhatsappCampaignRecipientInput,
  FindCrmWhatsappCampaignInput,
  IncrementCrmWhatsappCampaignCountsInput,
  ListCrmWhatsappCampaignRecipientsInput,
  ListCrmWhatsappCampaignsInput,
  UpdateCrmWhatsappCampaignInput,
  UpdateCrmWhatsappCampaignRecipientInput,
} from "./crmWhatsappCampaignRepositoryInputs.js";

export type {
  CreateCrmWhatsappQuickMessageInput,
  CrmWhatsappQuickMessage,
  CrmWhatsappQuickMessageKind,
  FindCrmWhatsappQuickMessageInput,
  ListCrmWhatsappQuickMessagesInput,
  UpdateCrmWhatsappQuickMessageInput,
} from "./crmWhatsappQuickMessageRepository.js";
export type {
  CreateCrmWhatsappCampaignInput,
  CreateCrmWhatsappCampaignRecipientInput,
  FindCrmWhatsappCampaignInput,
  IncrementCrmWhatsappCampaignCountsInput,
  ListCrmWhatsappCampaignRecipientsInput,
  ListCrmWhatsappCampaignsInput,
  UpdateCrmWhatsappCampaignInput,
  UpdateCrmWhatsappCampaignRecipientInput,
} from "./crmWhatsappCampaignRepositoryInputs.js";
export type {
  CrmWhatsappChannel,
  CrmWhatsappMessageDirection,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageStatus,
  CrmWhatsappMessageType,
  CrmWhatsappSessionStatus,
} from "./crmWhatsappRepositoryTypes.js";
export type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignRecipient,
  CrmWhatsappCampaignRecipientStatus,
  CrmWhatsappCampaignStatus,
  CrmWhatsappMessage,
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageScope,
  CrmWhatsappScheduledMessageStatus,
  CrmWhatsappSession,
  CrmWhatsappTag,
  IngestCrmWhatsappMessageResult,
} from "./crmWhatsappRepositoryModels.js";
export type {
  CountCrmWhatsappSessionsInput,
  CreateCrmWhatsappScheduledMessageInput,
  CreateCrmWhatsappTagInput,
  DeleteCrmWhatsappTagInput,
  FindCrmWhatsappMessageByExternalIdInput,
  FindCrmWhatsappMessageByIdInput,
  FindDueCrmWhatsappScheduledMessageScopesInput,
  FindDueCrmWhatsappScheduledMessagesInput,
  FindOrCreateCrmWhatsappTagInput,
  IngestCrmWhatsappMessageInput,
  ListCrmWhatsappMessagesInput,
  ListCrmWhatsappScheduledMessagesInput,
  ListCrmWhatsappSessionsInput,
  ListCrmWhatsappTagsInput,
  ReorderCrmWhatsappTagsInput,
  UpdateCrmWhatsappMessageInput,
  UpdateCrmWhatsappScheduledMessageInput,
  UpdateCrmWhatsappSessionInput,
  UpdateCrmWhatsappSessionTagInput,
  UpdateCrmWhatsappTagInput,
} from "./crmWhatsappRepositoryInputs.js";

export type CrmWhatsappRepository = {
  addSessionTag: (
    input: UpdateCrmWhatsappSessionTagInput,
  ) => Promise<CrmWhatsappSession | null>;
  countSessions: (input: CountCrmWhatsappSessionsInput) => Promise<number>;
  createQuickMessage: (
    input: CreateCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage>;
  createScheduledMessage: (
    input: CreateCrmWhatsappScheduledMessageInput,
  ) => Promise<CrmWhatsappScheduledMessage>;
  createCampaign: (
    input: CreateCrmWhatsappCampaignInput,
  ) => Promise<CrmWhatsappCampaign>;
  createCampaignRecipient: (
    input: CreateCrmWhatsappCampaignRecipientInput,
  ) => Promise<CrmWhatsappCampaignRecipient>;
  createTag: (input: CreateCrmWhatsappTagInput) => Promise<CrmWhatsappTag>;
  deleteQuickMessage: (
    input: FindCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  deleteTag: (
    input: DeleteCrmWhatsappTagInput,
  ) => Promise<CrmWhatsappTag | null>;
  findDueScheduledMessageScopes: (
    input: FindDueCrmWhatsappScheduledMessageScopesInput,
  ) => Promise<readonly CrmWhatsappScheduledMessageScope[]>;
  findDueScheduledMessages: (
    input: FindDueCrmWhatsappScheduledMessagesInput,
  ) => Promise<readonly CrmWhatsappScheduledMessage[]>;
  findMessageByExternalId: (
    input: FindCrmWhatsappMessageByExternalIdInput,
  ) => Promise<CrmWhatsappMessage | null>;
  findMessageById: (
    input: FindCrmWhatsappMessageByIdInput,
  ) => Promise<CrmWhatsappMessage | null>;
  findCampaignById: (
    input: FindCrmWhatsappCampaignInput,
  ) => Promise<CrmWhatsappCampaign | null>;
  findOrCreateTag: (
    input: FindOrCreateCrmWhatsappTagInput,
  ) => Promise<CrmWhatsappTag>;
  findQuickMessageById: (
    input: FindCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  ingestMessage: (
    input: IngestCrmWhatsappMessageInput,
  ) => Promise<IngestCrmWhatsappMessageResult>;
  incrementCampaignCounts: (
    input: IncrementCrmWhatsappCampaignCountsInput,
  ) => Promise<CrmWhatsappCampaign | null>;
  listMessages: (
    input: ListCrmWhatsappMessagesInput,
  ) => Promise<readonly CrmWhatsappMessage[]>;
  listCampaigns: (
    input: ListCrmWhatsappCampaignsInput,
  ) => Promise<readonly CrmWhatsappCampaign[]>;
  listCampaignRecipients: (
    input: ListCrmWhatsappCampaignRecipientsInput,
  ) => Promise<readonly CrmWhatsappCampaignRecipient[]>;
  listQuickMessages: (
    input: ListCrmWhatsappQuickMessagesInput,
  ) => Promise<readonly CrmWhatsappQuickMessage[]>;
  listScheduledMessages: (
    input: ListCrmWhatsappScheduledMessagesInput,
  ) => Promise<readonly CrmWhatsappScheduledMessage[]>;
  listSessions: (
    input: ListCrmWhatsappSessionsInput,
  ) => Promise<readonly CrmWhatsappSession[]>;
  listTags: (
    input: ListCrmWhatsappTagsInput,
  ) => Promise<readonly CrmWhatsappTag[]>;
  removeSessionTag: (
    input: UpdateCrmWhatsappSessionTagInput,
  ) => Promise<CrmWhatsappSession | null>;
  reorderTags: (
    input: ReorderCrmWhatsappTagsInput,
  ) => Promise<readonly CrmWhatsappTag[]>;
  updateMessage: (
    input: UpdateCrmWhatsappMessageInput,
  ) => Promise<CrmWhatsappMessage | null>;
  updateQuickMessage: (
    input: UpdateCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  updateScheduledMessage: (
    input: UpdateCrmWhatsappScheduledMessageInput,
  ) => Promise<CrmWhatsappScheduledMessage | null>;
  updateCampaign: (
    input: UpdateCrmWhatsappCampaignInput,
  ) => Promise<CrmWhatsappCampaign | null>;
  updateCampaignRecipient: (
    input: UpdateCrmWhatsappCampaignRecipientInput,
  ) => Promise<CrmWhatsappCampaignRecipient | null>;
  updateSession: (
    input: UpdateCrmWhatsappSessionInput,
  ) => Promise<CrmWhatsappSession | null>;
  updateTag: (
    input: UpdateCrmWhatsappTagInput,
  ) => Promise<CrmWhatsappTag | null>;
};
