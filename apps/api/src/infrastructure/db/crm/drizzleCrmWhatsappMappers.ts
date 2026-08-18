import type {
  canonicalMessages,
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmWhatsappChannel,
  CrmWhatsappHumanAttendanceState,
  CrmWhatsappMessage,
  CrmWhatsappMessageDirection,
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageStatus,
  CrmWhatsappSession,
  CrmWhatsappSessionStatus,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";

export type CanonicalWhatsappSessionRow = {
  attendance: typeof conversationAttendances.$inferSelect;
  cycle: typeof conversationCycles.$inferSelect;
  thread: typeof conversationThreads.$inferSelect;
};

type CanonicalMessageRow = typeof canonicalMessages.$inferSelect & {
  channel: typeof conversationThreads.$inferSelect.channel;
};

export type CanonicalCrmChannel =
  typeof conversationThreads.$inferSelect.channel;

export function toCanonicalChannel(
  channel: CrmWhatsappChannel,
): CanonicalCrmChannel {
  switch (channel) {
    case "INSTAGRAM":
      return "instagram";
    case "OLX_CHAT":
      return "olx_chat";
    case "WHATSAPP":
      return "whatsapp";
    case "WEB_CHAT":
      throw new Error("WEB_CHAT has no canonical CRM channel mapping.");
  }
}

export function toWhatsappSession(
  row: CanonicalWhatsappSessionRow,
  unreadCount: number,
): CrmWhatsappSession {
  const { attendance, cycle, thread } = row;
  const cycleMetadata = readRecord(cycle.metadata);
  return {
    assignedUserId: cycle.assignedUserId as UserId | null,
    buyerChatLid: thread.customerChatId,
    buyerName: thread.customerDisplayName,
    buyerPhone: thread.customerPhone ?? "",
    channel: fromCanonicalChannel(thread.channel),
    channelExternalId: thread.externalThreadId,
    channelMetadata: readRecord(thread.channelMetadata),
    connectionId: thread.providerConnectionId,
    createdAt: cycle.createdAt,
    externalSessionId: cycle.externalCycleId,
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
      ...readRecord(cycleMetadata.sessionMetadata),
    },
    profilePhotoUrl: thread.profilePhotoUrl,
    revision: cycle.revision,
    sessionTags: [],
    source: thread.source,
    status: fromCanonicalSessionStatus(row),
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

export function toWhatsappMessage(
  row: CanonicalMessageRow,
): CrmWhatsappMessage {
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
    senderOrigin: fromCanonicalSenderOrigin(row.senderOrigin),
    senderType: fromCanonicalSender(row.sender),
    sessionId: row.cycleId,
    status: fromCanonicalMessageStatus(row.status),
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    type: assertMessageType(row.messageType),
    updatedAt: row.updatedAt,
  };
}

function fromCanonicalChannel(
  channel: CanonicalWhatsappSessionRow["thread"]["channel"],
): CrmWhatsappChannel {
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
  state: CanonicalWhatsappSessionRow["attendance"]["state"],
): CrmWhatsappHumanAttendanceState | null {
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

function fromCanonicalSessionStatus(
  row: CanonicalWhatsappSessionRow,
): CrmWhatsappSessionStatus {
  if (row.cycle.state === "completed") return "COMPLETED";
  if (row.cycle.state === "expired") return "EXPIRED";
  if (fromCanonicalAttendance(row.attendance.state)) return "HUMAN_TAKEOVER";
  const preserved = readRecord(row.cycle.metadata).sessionStatus;
  if (preserved === "MINIBOT_ACTIVE") return preserved;
  if (preserved === undefined || preserved === "ACTIVE") return "ACTIVE";
  throw new Error("Canonical CRM cycle has an unsupported session status.");
}

function fromCanonicalDirection(
  direction: CanonicalMessageRow["direction"],
): CrmWhatsappMessageDirection {
  return direction === "inbound" ? "INBOUND" : "OUTBOUND";
}

function fromCanonicalMessageStatus(
  status: CanonicalMessageRow["status"],
): CrmWhatsappMessageStatus {
  return status.toUpperCase() as CrmWhatsappMessageStatus;
}

function fromCanonicalSender(
  sender: CanonicalMessageRow["sender"],
): CrmWhatsappMessageSenderType {
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

function fromCanonicalSenderOrigin(
  origin: CanonicalMessageRow["senderOrigin"],
): CrmWhatsappMessageSenderOrigin {
  switch (origin) {
    case "external_bot":
      return "bot_api";
    case "customer":
      return "customer";
    case "human_crm":
      return "human_crm";
    case "human_channel":
      return "human_whatsapp";
    case "system":
      return "system";
    case "unknown":
      return "unknown";
  }
}

function assertMessageType(value: string): CrmWhatsappMessage["type"] {
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
