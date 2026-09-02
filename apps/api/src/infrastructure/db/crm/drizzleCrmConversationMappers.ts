import type {
  crmMessages,
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmMessagingChannel,
  CrmHumanAttendanceState,
  CrmMessage,
  CrmMessageDirection,
  CrmMessageSenderType,
  CrmMessageStatus,
  CrmConversationCycle,
  CrmConversationCycleStatus,
} from "../../../domains/crm/ports/crmConversationRepository.js";

export type CanonicalConversationCycleRow = {
  attendance: typeof conversationAttendances.$inferSelect;
  cycle: typeof conversationCycles.$inferSelect;
  thread: typeof conversationThreads.$inferSelect;
};

type CanonicalMessageRow = typeof crmMessages.$inferSelect & {
  channel: typeof conversationThreads.$inferSelect.channel;
};

export type CanonicalCrmChannel =
  typeof conversationThreads.$inferSelect.channel;

export function toCanonicalChannel(
  channel: CrmMessagingChannel,
): CanonicalCrmChannel {
  switch (channel) {
    case "INSTAGRAM":
      return "instagram";
    case "OLX_CHAT":
      return "olx_chat";
    case "WHATSAPP":
      return "whatsapp";
  }
}

export function toConversationCycle(
  row: CanonicalConversationCycleRow,
  unreadCount: number,
): CrmConversationCycle {
  const { attendance, cycle, thread } = row;
  const cycleMetadata = readRecord(cycle.metadata);
  return {
    assignedUserId: cycle.assignedUserId as UserId | null,
    archivedAt: cycle.archivedAt,
    customerChatId: thread.customerChatId,
    customerDisplayName: thread.customerDisplayName,
    customerPhone: thread.customerPhone ?? "",
    channel: fromCanonicalChannel(thread.channel),
    externalThreadId: thread.externalThreadId,
    channelMetadata: readRecord(thread.channelMetadata),
    connectionId: thread.providerConnectionId,
    createdAt: cycle.createdAt,
    deletedAt: cycle.deletedAt,
    externalCycleId: cycle.externalCycleId,
    firstHandledAt: cycle.firstHandledAt,
    freshLeadAt: cycle.freshLeadAt,
    humanAttendanceChangedAt:
      attendance.stateVersion > 0 ? attendance.changedAt : null,
    humanAttendanceState: fromCanonicalAttendance(attendance.state),
    humanAttendanceStateVersion:
      attendance.stateVersion > 0 ? attendance.stateVersion : null,
    humanHandlingStartedAt: attendance.handlingStartedAt,
    humanTakeoverAt: attendance.handoffRequestedAt,
    interventionId: attendance.interventionId,
    id: cycle.id,
    lastAssignedAt: attendance.assignedAt,
    lastCustomerReadAt: cycle.lastCustomerReadAt,
    lastMessageAt: cycle.lastMessageAt,
    lastMessageContent: cycle.lastMessageContent,
    lastReadAt: cycle.lastReadAt,
    leadId: readNullableString(cycleMetadata.leadId),
    messageCount: cycle.messageCount,
    metadata: {
      ...readRecord(thread.metadata),
      ...readRecord(cycleMetadata.cycleMetadata),
    },
    profilePhotoUrl: thread.profilePhotoUrl,
    pinnedAt: cycle.pinnedAt,
    revision: cycle.revision,
    tags: [],
    threadId: thread.id,
    source: thread.source,
    status: fromCanonicalConversationCycleStatus(row),
    storeId: cycle.storeId as StoreId,
    tenantId: cycle.tenantId as TenantId,
    unreadCount,
    updatedAt: latestDate(
      cycle.updatedAt,
      thread.updatedAt,
      attendance.updatedAt,
    ),
  };
}

export function toCrmMessage(row: CanonicalMessageRow): CrmMessage {
  const metadata = readRecord(row.metadata);
  return {
    channel: fromCanonicalChannel(row.channel),
    channelMessageId: readNullableString(metadata.channelMessageId),
    connectionId: row.providerConnectionId,
    content: row.content,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
    direction: fromCanonicalDirection(row.direction),
    externalId: row.providerMessageId,
    id: row.id,
    mediaType: row.mediaType,
    mediaUrl: row.mediaUrl,
    metadata: readRecord(metadata.providerMetadata),
    providerTimestamp:
      metadata.providerTimestampCleared === true ? null : row.occurredAt,
    senderOrigin: row.senderOrigin,
    senderType: fromCanonicalSender(row.sender),
    cycleId: row.cycleId,
    status: fromCanonicalMessageStatus(row.status),
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    type: assertMessageType(row.messageType),
    updatedAt: row.updatedAt,
  };
}

function fromCanonicalChannel(
  channel: CanonicalConversationCycleRow["thread"]["channel"],
): CrmMessagingChannel {
  switch (channel) {
    case "whatsapp":
      return "WHATSAPP";
    case "instagram":
      return "INSTAGRAM";
    case "olx_chat":
      return "OLX_CHAT";
  }
}

function fromCanonicalAttendance(
  state: CanonicalConversationCycleRow["attendance"]["state"],
): CrmHumanAttendanceState | null {
  switch (state) {
    case "handoff_requested":
    case "human_claimed":
      return "WAITING_HUMAN";
    case "human_active":
      return "IN_HUMAN_SERVICE";
    case "bot_active":
    case "handback_pending":
      return null;
  }
}

function fromCanonicalConversationCycleStatus(
  row: CanonicalConversationCycleRow,
): CrmConversationCycleStatus {
  if (row.cycle.state === "completed") return "COMPLETED";
  if (row.cycle.state === "expired") return "EXPIRED";
  if (fromCanonicalAttendance(row.attendance.state)) return "HUMAN_TAKEOVER";
  const preserved = readRecord(row.cycle.metadata).sessionStatus;
  if (preserved === "MINIBOT_ACTIVE") return preserved;
  if (preserved === undefined || preserved === "ACTIVE") return "ACTIVE";
  throw new Error(
    "Canonical CRM cycle has an unsupported conversationCycle status.",
  );
}

function fromCanonicalDirection(
  direction: CanonicalMessageRow["direction"],
): CrmMessageDirection {
  return direction === "inbound" ? "INBOUND" : "OUTBOUND";
}

function fromCanonicalMessageStatus(
  status: CanonicalMessageRow["status"],
): CrmMessageStatus {
  return status.toUpperCase() as CrmMessageStatus;
}

function fromCanonicalSender(
  sender: CanonicalMessageRow["sender"],
): CrmMessageSenderType {
  switch (sender) {
    case "bot":
      return "AI";
    case "customer":
      return "CUSTOMER";
    case "human":
      return "HUMAN";
    case "system":
      return "SYSTEM";
    case "unknown":
      throw new Error("Canonical CRM message sender is unknown.");
  }
}

function assertMessageType(value: string): CrmMessage["type"] {
  // prettier-ignore
  const supported = ["AUDIO", "CATALOG", "CONTACT", "DOCUMENT", "IMAGE", "INTERACTIVE", "LOCATION", "STICKER", "TEMPLATE", "TEXT", "VIDEO"] as const;
  const normalized = value.toUpperCase();
  const match = supported.find((candidate) => candidate === normalized);
  if (!match) throw new Error("Canonical CRM message type is unsupported.");
  return match;
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function latestDate(...dates: Date[]) {
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}
