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
  IngestCrmMessageResult,
} from "./crmConversationRepositoryModels.js";
import type {
  CountCrmConversationCyclesInput,
  CreateCrmScheduledMessageInput,
  FindCrmMessageByExternalIdInput,
  FindCrmMessageByIdInput,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  IngestCrmMessageInput,
  ListCrmMessagesInput,
  ListCrmScheduledMessagesInput,
  ListCrmConversationCyclesInput,
  UpdateCrmMessageInput,
  UpdateCrmScheduledMessageInput,
  UpdateCrmConversationCycleInput,
  TransitionCrmAttendanceInput,
  UpsertCrmConversationCycleContextInput,
} from "./crmConversationRepositoryInputs.js";
import type {
  CreateCrmCampaignInput,
  CreateCrmCampaignRecipientInput,
  FindCrmCampaignInput,
  IncrementCrmCampaignCountsInput,
  RecordCrmCampaignDeliveryInput,
  ClaimCrmCampaignReplyInput,
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
  RecordCrmCampaignDeliveryInput,
  ClaimCrmCampaignReplyInput,
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
  IngestCrmMessageResult,
} from "./crmConversationRepositoryModels.js";
export type {
  CountCrmConversationCyclesInput,
  CrmQueueVisibility,
  CreateCrmScheduledMessageInput,
  FindCrmMessageByExternalIdInput,
  FindCrmMessageByIdInput,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  IngestCrmMessageInput,
  ListCrmMessagesInput,
  ListCrmScheduledMessagesInput,
  ListCrmConversationCyclesInput,
  UpdateCrmMessageInput,
  UpdateCrmScheduledMessageInput,
  UpdateCrmConversationCycleInput,
  TransitionCrmAttendanceInput,
  UpsertCrmConversationCycleContextInput,
} from "./crmConversationRepositoryInputs.js";

export type CrmConversationRepository = {
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
  deleteQuickMessage: (
    input: FindCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage | null>;
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
  findQuickMessageById: (
    input: FindCrmQuickMessageInput,
  ) => Promise<CrmQuickMessage | null>;
  ingestMessage: (
    input: IngestCrmMessageInput,
  ) => Promise<IngestCrmMessageResult>;
  incrementCampaignCounts: (
    input: IncrementCrmCampaignCountsInput,
  ) => Promise<CrmCampaign | null>;
  recordCampaignDelivery: (
    input: RecordCrmCampaignDeliveryInput,
  ) => Promise<CrmCampaign | null>;
  claimCampaignReply: (
    input: ClaimCrmCampaignReplyInput,
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
  upsertConversationCycleContext: (
    input: UpsertCrmConversationCycleContextInput,
  ) => Promise<CrmConversationCycle>;
};
