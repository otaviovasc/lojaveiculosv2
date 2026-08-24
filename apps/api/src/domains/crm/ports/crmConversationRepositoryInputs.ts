import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmMessagingChannel,
  CrmHumanAttendanceState,
  CrmInterventionActorKind,
  CrmMessageDirection,
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
  CrmMessageStatus,
  CrmMessageType,
  CrmConversationCycleStatus,
} from "./crmConversationRepositoryTypes.js";
export type {
  CreateCrmScheduledMessageInput,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  ListCrmScheduledMessagesInput,
  UpdateCrmScheduledMessageInput,
} from "./crmConversationRepositoryScheduledInputs.js";

export type CrmQueueVisibility =
  { kind: "assigned"; userId: UserId } | { kind: "global" } | { kind: "none" };

export type CountCrmConversationCyclesInput = {
  assignedUserId?: UserId;
  connectionId?: string;
  filter?: "all" | "fresh" | "mine" | "others" | "unassigned";
  humanAttendanceState?: CrmHumanAttendanceState;
  leadId?: string;
  queueVisibility?: CrmQueueVisibility;
  search?: string;
  selectedAssigneeId?: UserId;
  cycleId?: string;
  status?: CrmConversationCycleStatus;
  tagIds?: string[];
  storeId: StoreId;
  tenantId: TenantId;
  unreadOnly?: boolean;
};

export type ListCrmConversationCyclesInput = CountCrmConversationCyclesInput & {
  limit: number;
  offset: number;
};

export type ListCrmMessagesInput = {
  direction?: CrmMessageDirection;
  limit: number;
  offset: number;
  cycleId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type IngestCrmMessageInput = {
  customerChatId?: string;
  customerDisplayName?: string;
  customerPhone: string;
  channel: CrmMessagingChannel;
  externalThreadId?: string;
  channelMessageId?: string;
  connectionId: string;
  content: string;
  direction: CrmMessageDirection;
  externalId: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  providerTimestamp: Date;
  profilePhotoUrl?: string;
  profilePhotoStorageKey?: string;
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
  firstHandledAt?: Date | null;
  freshLeadAt?: Date | null;
  leadId?: string | null;
  status: CrmMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  type: CrmMessageType;
};

export type UpsertCrmConversationCycleContextInput = {
  customerChatId?: string;
  customerDisplayName?: string;
  customerPhone: string;
  channel: CrmMessagingChannel;
  externalThreadId?: string;
  connectionId: string;
  profilePhotoUrl?: string;
  profilePhotoStorageKey?: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmConversationCycleInput = {
  assignedUserId?: UserId | null;
  expectedHumanAttendanceStateVersion?: number | null;
  expectedInterventionId?: string | null;
  expectedRevision?: number;
  expectedStatus?: CrmConversationCycleStatus;
  firstHandledAt?: Date | null;
  freshLeadAt?: Date | null;
  humanAttendanceChangedAt?: Date | null;
  humanAttendanceState?: CrmHumanAttendanceState | null;
  humanAttendanceStateVersion?: number | null;
  humanHandlingStartedAt?: Date | null;
  humanTakeoverAt?: Date | null;
  interventionId?: string | null;
  lastAssignedAt?: Date | null;
  lastCustomerReadAt?: Date | null;
  lastReadAt?: Date | null;
  leadId?: string | null;
  metadata?: Record<string, unknown>;
  cycleId: string;
  status?: CrmConversationCycleStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type TransitionCrmAttendanceInput = UpdateCrmConversationCycleInput & {
  actorId: string;
  actorKind: CrmInterventionActorKind;
  expectedRevision: number;
  idempotencyKey: string;
  interventionIdForLedger: string;
  nextState: CrmHumanAttendanceState | null;
  occurredAt: Date;
  previousState: CrmHumanAttendanceState | null;
  reason: string;
  requestFingerprint: string;
  source: string;
};

export type FindCrmMessageByExternalIdInput = {
  connectionId: string;
  externalId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmMessageByIdInput = {
  messageId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmMessageInput = {
  deletedAt?: Date | null;
  externalId?: string | null;
  messageId: string;
  metadata?: Record<string, unknown>;
  mediaUrl?: string | null;
  providerTimestamp?: Date | null;
  status?: CrmMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindOrCreateCrmTagInput = {
  color?: string;
  connectionId?: string | null;
  emoji?: string | null;
  name: string;
  sortOrder?: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateCrmTagInput = FindOrCreateCrmTagInput;

export type UpdateCrmTagInput = {
  color?: string;
  emoji?: string | null;
  id: string;
  name?: string;
  sortOrder?: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type DeleteCrmTagInput = {
  id: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type ReorderCrmTagsInput = {
  storeId: StoreId;
  tagIds: readonly string[];
  tenantId: TenantId;
};

export type ListCrmTagsInput = {
  connectionId?: string | null;
  limit: number;
  search?: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmConversationCycleTagInput = {
  cycleId: string;
  storeId: StoreId;
  tagId: string;
  tenantId: TenantId;
};
