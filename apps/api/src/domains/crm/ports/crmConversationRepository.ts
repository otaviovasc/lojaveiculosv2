import type {
  CreateCrmQuickMessageInput,
  CrmQuickMessage,
  FindCrmQuickMessageInput,
  ListCrmQuickMessagesInput,
  UpdateCrmQuickMessageInput,
} from "./crmQuickMessageRepository.js";
import type {
  CrmCampaign,
  CrmCampaignRecipient,
  CrmAssigneeConversationCycleCount,
  CrmMessage,
  CrmScheduledMessage,
  CrmScheduledMessageScope,
  CrmConversationCycle,
  CrmTag,
  IngestCrmMessageResult,
} from "./crmConversationRepositoryModels.js";
import type {
  CountCrmConversationCyclesInput,
  CreateCrmScheduledMessageInput,
  CreateCrmTagInput,
  DeleteCrmTagInput,
  FindCrmMessageByExternalIdInput,
  FindCrmMessageByIdInput,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  FindOrCreateCrmTagInput,
  IngestCrmMessageInput,
  ListCrmMessagesInput,
  ListCrmScheduledMessagesInput,
  ListCrmConversationCyclesInput,
  ListCrmTagsInput,
  ReorderCrmTagsInput,
  UpdateCrmMessageInput,
  UpdateCrmScheduledMessageInput,
  UpdateCrmConversationCycleInput,
  TransitionCrmAttendanceInput,
  UpdateCrmConversationCycleTagInput,
  UpdateCrmTagInput,
  UpsertCrmConversationCycleContextInput,
} from "./crmConversationRepositoryInputs.js";
import type {
  CreateCrmCampaignInput,
  CreateCrmCampaignRecipientInput,
  FindCrmCampaignInput,
  IncrementCrmCampaignCountsInput,
  ListCrmCampaignRecipientsInput,
  ListCrmCampaignsInput,
  UpdateCrmCampaignInput,
  UpdateCrmCampaignRecipientInput,
} from "./crmCampaignRepositoryInputs.js";

export type {
  CreateCrmQuickMessageInput,
  CrmQuickMessage,
  CrmQuickMessageKind,
  FindCrmQuickMessageInput,
  ListCrmQuickMessagesInput,
  UpdateCrmQuickMessageInput,
} from "./crmQuickMessageRepository.js";
export type {
  CreateCrmCampaignInput,
  CreateCrmCampaignRecipientInput,
  FindCrmCampaignInput,
  IncrementCrmCampaignCountsInput,
  ListCrmCampaignRecipientsInput,
  ListCrmCampaignsInput,
  UpdateCrmCampaignInput,
  UpdateCrmCampaignRecipientInput,
} from "./crmCampaignRepositoryInputs.js";
export type {
  CrmMessagingChannel,
  CrmHumanAttendanceState,
  CrmInterventionActorKind,
  CrmMessageDirection,
  CrmMessageSenderType,
  CrmMessageSenderOrigin,
  CrmMessageStatus,
  CrmMessageType,
  CrmConversationCycleStatus,
} from "./crmConversationRepositoryTypes.js";
export type {
  CrmCampaign,
  CrmCampaignRecipient,
  CrmCampaignRecipientStatus,
  CrmCampaignStatus,
  CrmAssigneeConversationCycleCount,
  CrmMessage,
  CrmScheduledMessage,
  CrmScheduledMessageScope,
  CrmScheduledMessageStatus,
  CrmConversationCycle,
  CrmTag,
  IngestCrmMessageResult,
} from "./crmConversationRepositoryModels.js";
export type {
  CountCrmConversationCyclesInput,
  CrmQueueVisibility,
  CreateCrmScheduledMessageInput,
  CreateCrmTagInput,
  DeleteCrmTagInput,
  FindCrmMessageByExternalIdInput,
  FindCrmMessageByIdInput,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  FindOrCreateCrmTagInput,
  IngestCrmMessageInput,
  ListCrmMessagesInput,
  ListCrmScheduledMessagesInput,
  ListCrmConversationCyclesInput,
  ListCrmTagsInput,
  ReorderCrmTagsInput,
  UpdateCrmMessageInput,
  UpdateCrmScheduledMessageInput,
  UpdateCrmConversationCycleInput,
  TransitionCrmAttendanceInput,
  UpdateCrmConversationCycleTagInput,
  UpdateCrmTagInput,
  UpsertCrmConversationCycleContextInput,
} from "./crmConversationRepositoryInputs.js";

export type CrmConversationRepository = {
  addConversationCycleTag: (
    input: UpdateCrmConversationCycleTagInput,
  ) => Promise<CrmConversationCycle | null>;
  countConversationCycles: (
    input: CountCrmConversationCyclesInput,
  ) => Promise<number>;
  countConversationCyclesByAssignee: (
    input: CountCrmConversationCyclesInput,
  ) => Promise<readonly CrmAssigneeConversationCycleCount[]>;
  createQuickMessage: (
    input: CreateCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage>;
  createScheduledMessage: (
    input: CreateCrmScheduledMessageInput,
  ) => Promise<CrmScheduledMessage>;
  createCampaign: (input: CreateCrmCampaignInput) => Promise<CrmCampaign>;
  createCampaignRecipient: (
    input: CreateCrmCampaignRecipientInput,
  ) => Promise<CrmCampaignRecipient>;
  createTag: (input: CreateCrmTagInput) => Promise<CrmTag>;
  deleteQuickMessage: (
    input: FindCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage | null>;
  deleteTag: (input: DeleteCrmTagInput) => Promise<CrmTag | null>;
  findDueScheduledMessageScopes: (
    input: FindDueCrmScheduledMessageScopesInput,
  ) => Promise<readonly CrmScheduledMessageScope[]>;
  findDueScheduledMessages: (
    input: FindDueCrmScheduledMessagesInput,
  ) => Promise<readonly CrmScheduledMessage[]>;
  findMessageByExternalId: (
    input: FindCrmMessageByExternalIdInput,
  ) => Promise<CrmMessage | null>;
  findMessageById: (
    input: FindCrmMessageByIdInput,
  ) => Promise<CrmMessage | null>;
  findConversationCycleByIdentity: (
    input: UpsertCrmConversationCycleContextInput,
  ) => Promise<CrmConversationCycle | null>;
  findCampaignById: (
    input: FindCrmCampaignInput,
  ) => Promise<CrmCampaign | null>;
  findOrCreateTag: (input: FindOrCreateCrmTagInput) => Promise<CrmTag>;
  findQuickMessageById: (
    input: FindCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage | null>;
  ingestMessage: (
    input: IngestCrmMessageInput,
  ) => Promise<IngestCrmMessageResult>;
  incrementCampaignCounts: (
    input: IncrementCrmCampaignCountsInput,
  ) => Promise<CrmCampaign | null>;
  listMessages: (input: ListCrmMessagesInput) => Promise<readonly CrmMessage[]>;
  listCampaigns: (
    input: ListCrmCampaignsInput,
  ) => Promise<readonly CrmCampaign[]>;
  listCampaignRecipients: (
    input: ListCrmCampaignRecipientsInput,
  ) => Promise<readonly CrmCampaignRecipient[]>;
  listQuickMessages: (
    input: ListCrmQuickMessagesInput,
  ) => Promise<readonly CrmQuickMessage[]>;
  listScheduledMessages: (
    input: ListCrmScheduledMessagesInput,
  ) => Promise<readonly CrmScheduledMessage[]>;
  listConversationCycles: (
    input: ListCrmConversationCyclesInput,
  ) => Promise<readonly CrmConversationCycle[]>;
  listTags: (input: ListCrmTagsInput) => Promise<readonly CrmTag[]>;
  removeConversationCycleTag: (
    input: UpdateCrmConversationCycleTagInput,
  ) => Promise<CrmConversationCycle | null>;
  reorderTags: (input: ReorderCrmTagsInput) => Promise<readonly CrmTag[]>;
  updateMessage: (input: UpdateCrmMessageInput) => Promise<CrmMessage | null>;
  updateQuickMessage: (
    input: UpdateCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage | null>;
  updateScheduledMessage: (
    input: UpdateCrmScheduledMessageInput,
  ) => Promise<CrmScheduledMessage | null>;
  updateCampaign: (
    input: UpdateCrmCampaignInput,
  ) => Promise<CrmCampaign | null>;
  updateCampaignRecipient: (
    input: UpdateCrmCampaignRecipientInput,
  ) => Promise<CrmCampaignRecipient | null>;
  updateConversationCycle: (
    input: UpdateCrmConversationCycleInput,
  ) => Promise<CrmConversationCycle | null>;
  transitionAttendance: (input: TransitionCrmAttendanceInput) => Promise<{
    conversationCycle: CrmConversationCycle;
    transitionCreated: boolean;
  } | null>;
  updateTag: (input: UpdateCrmTagInput) => Promise<CrmTag | null>;
  upsertConversationCycleContext: (
    input: UpsertCrmConversationCycleContextInput,
  ) => Promise<CrmConversationCycle>;
};
