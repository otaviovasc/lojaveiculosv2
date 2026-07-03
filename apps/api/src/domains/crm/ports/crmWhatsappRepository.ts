import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CreateCrmWhatsappQuickMessageInput,
  CrmWhatsappQuickMessage,
  FindCrmWhatsappQuickMessageInput,
  ListCrmWhatsappQuickMessagesInput,
  UpdateCrmWhatsappQuickMessageInput,
} from "./crmWhatsappQuickMessageRepository.js";
import type {
  CrmWhatsappChannel,
  CrmWhatsappMessageDirection,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageStatus,
  CrmWhatsappMessageType,
  CrmWhatsappSessionStatus,
} from "./crmWhatsappRepositoryTypes.js";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  CrmWhatsappTag,
  IngestCrmWhatsappMessageResult,
} from "./crmWhatsappRepositoryModels.js";

export type {
  CreateCrmWhatsappQuickMessageInput,
  CrmWhatsappQuickMessage,
  CrmWhatsappQuickMessageKind,
  FindCrmWhatsappQuickMessageInput,
  ListCrmWhatsappQuickMessagesInput,
  UpdateCrmWhatsappQuickMessageInput,
} from "./crmWhatsappQuickMessageRepository.js";
export type {
  CrmWhatsappChannel,
  CrmWhatsappMessageDirection,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageStatus,
  CrmWhatsappMessageType,
  CrmWhatsappSessionStatus,
} from "./crmWhatsappRepositoryTypes.js";
export type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  CrmWhatsappTag,
  IngestCrmWhatsappMessageResult,
} from "./crmWhatsappRepositoryModels.js";

export type CountCrmWhatsappSessionsInput = {
  assignedUserId?: UserId;
  connectionId?: string;
  filter?: "all" | "fresh" | "mine" | "others" | "unassigned";
  search?: string;
  sessionId?: string;
  status?: CrmWhatsappSessionStatus;
  tagIds?: string[];
  storeId: StoreId;
  tenantId: TenantId;
  unreadOnly?: boolean;
};

export type ListCrmWhatsappSessionsInput = CountCrmWhatsappSessionsInput & {
  limit: number;
  offset: number;
};

export type ListCrmWhatsappMessagesInput = {
  limit: number;
  offset: number;
  sessionId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type IngestCrmWhatsappMessageInput = {
  buyerChatLid?: string;
  buyerName?: string;
  buyerPhone: string;
  channel: CrmWhatsappChannel;
  connectionId: string;
  content: string;
  direction: CrmWhatsappMessageDirection;
  externalId: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  providerTimestamp: Date;
  senderType: CrmWhatsappMessageSenderType;
  firstHandledAt?: Date | null;
  freshLeadAt?: Date | null;
  leadId?: string | null;
  status: CrmWhatsappMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
  type: CrmWhatsappMessageType;
};

export type UpdateCrmWhatsappSessionInput = {
  assignedUserId?: UserId | null;
  firstHandledAt?: Date | null;
  freshLeadAt?: Date | null;
  humanTakeoverAt?: Date | null;
  lastAssignedAt?: Date | null;
  lastCustomerReadAt?: Date | null;
  lastReadAt?: Date | null;
  leadId?: string | null;
  metadata?: Record<string, unknown>;
  sessionId: string;
  status?: CrmWhatsappSessionStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmWhatsappMessageByExternalIdInput = {
  connectionId: string;
  externalId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmWhatsappMessageByIdInput = {
  messageId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmWhatsappMessageInput = {
  deletedAt?: Date | null;
  externalId?: string | null;
  messageId: string;
  metadata?: Record<string, unknown>;
  providerTimestamp?: Date | null;
  status?: CrmWhatsappMessageStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindOrCreateCrmWhatsappTagInput = {
  color?: string;
  connectionId?: string | null;
  emoji?: string | null;
  isColumn?: boolean;
  name: string;
  sortOrder?: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type ListCrmWhatsappTagsInput = {
  connectionId?: string | null;
  limit: number;
  search?: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpdateCrmWhatsappSessionTagInput = {
  sessionId: string;
  storeId: StoreId;
  tagId: string;
  tenantId: TenantId;
};

export type CrmWhatsappRepository = {
  addSessionTag: (
    input: UpdateCrmWhatsappSessionTagInput,
  ) => Promise<CrmWhatsappSession | null>;
  findMessageByExternalId: (
    input: FindCrmWhatsappMessageByExternalIdInput,
  ) => Promise<CrmWhatsappMessage | null>;
  findMessageById: (
    input: FindCrmWhatsappMessageByIdInput,
  ) => Promise<CrmWhatsappMessage | null>;
  findOrCreateTag: (
    input: FindOrCreateCrmWhatsappTagInput,
  ) => Promise<CrmWhatsappTag>;
  listTags: (
    input: ListCrmWhatsappTagsInput,
  ) => Promise<readonly CrmWhatsappTag[]>;
  createQuickMessage: (
    input: CreateCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage>;
  countSessions: (input: CountCrmWhatsappSessionsInput) => Promise<number>;
  findQuickMessageById: (
    input: FindCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  ingestMessage: (
    input: IngestCrmWhatsappMessageInput,
  ) => Promise<IngestCrmWhatsappMessageResult>;
  listMessages: (
    input: ListCrmWhatsappMessagesInput,
  ) => Promise<readonly CrmWhatsappMessage[]>;
  listQuickMessages: (
    input: ListCrmWhatsappQuickMessagesInput,
  ) => Promise<readonly CrmWhatsappQuickMessage[]>;
  listSessions: (
    input: ListCrmWhatsappSessionsInput,
  ) => Promise<readonly CrmWhatsappSession[]>;
  deleteQuickMessage: (
    input: FindCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  updateSession: (
    input: UpdateCrmWhatsappSessionInput,
  ) => Promise<CrmWhatsappSession | null>;
  updateQuickMessage: (
    input: UpdateCrmWhatsappQuickMessageInput,
  ) => Promise<CrmWhatsappQuickMessage | null>;
  updateMessage: (
    input: UpdateCrmWhatsappMessageInput,
  ) => Promise<CrmWhatsappMessage | null>;
  removeSessionTag: (
    input: UpdateCrmWhatsappSessionTagInput,
  ) => Promise<CrmWhatsappSession | null>;
};
