import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappTag,
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";

export type WhatsappSession = {
  assignedMember: null;
  assignedUserId: string | null;
  buyerName: string | null;
  buyerPhone: string;
  channel: string;
  connection: {
    id: string;
    name: string;
    phone: string | null;
    provider: string;
    status: string;
  };
  firstHandledAt: Date | null;
  freshLeadAt: Date | null;
  humanTakeoverAt: Date | null;
  id: string;
  lastAssignedAt: Date | null;
  lastCustomerReadAt: Date | null;
  lastMessageAt: Date | null;
  lastMessageContent: string | null;
  lastReadAt: Date | null;
  leadId: string | null;
  linkedSessionId: null;
  metadata: Record<string, unknown>;
  profilePhotoUrl: string | null;
  sessionTags: WhatsappSessionTag[];
  status: string;
  unreadCount: number;
  uuid: string;
  vehicle: WhatsappSessionVehicle | null;
};

export type WhatsappSessionTag = Pick<
  CrmWhatsappTag,
  "color" | "emoji" | "id" | "name" | "sortOrder"
>;

export type WhatsappSessionVehicle = {
  id?: number | string;
  mainPhotoUrl?: string | null;
  title?: string | null;
};

export type WhatsappMessage = {
  channel: string;
  content: string;
  createdAt: Date;
  deletedAt: Date | null;
  direction: string;
  externalId: string | null;
  id: string;
  mediaType: string | null;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  providerTimestamp: Date | null;
  senderType: string;
  status: string;
  type: string;
  uuid: string;
};

export function toWhatsappSession(
  session: CrmWhatsappSession,
  connection: CrmConnection,
): WhatsappSession {
  return {
    assignedMember: null,
    assignedUserId: session.assignedUserId,
    buyerName: session.buyerName,
    buyerPhone: session.buyerPhone,
    channel: session.channel,
    connection: {
      id: connection.id,
      name: connection.displayName,
      phone: connection.phone,
      provider: connection.provider,
      status: connection.status,
    },
    firstHandledAt: session.firstHandledAt,
    freshLeadAt: session.freshLeadAt,
    humanTakeoverAt: session.humanTakeoverAt,
    id: session.id,
    lastAssignedAt: session.lastAssignedAt,
    lastCustomerReadAt: session.lastCustomerReadAt,
    lastMessageAt: session.lastMessageAt,
    lastMessageContent: session.lastMessageContent,
    lastReadAt: session.lastReadAt,
    leadId: session.leadId,
    linkedSessionId: null,
    metadata: session.metadata,
    profilePhotoUrl: session.profilePhotoUrl,
    sessionTags: session.sessionTags,
    status: session.status,
    unreadCount: session.unreadCount,
    uuid: session.id,
    vehicle: readSessionVehicle(session.metadata),
  };
}

export function readSessionVehicle(
  metadata: Record<string, unknown>,
): WhatsappSessionVehicle | null {
  const value = metadata.crmWhatsappVehicle;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title : null;
  const mainPhotoUrl =
    typeof record.mainPhotoUrl === "string" ? record.mainPhotoUrl : null;
  const id =
    typeof record.id === "string" || typeof record.id === "number"
      ? record.id
      : undefined;
  if (!title && !id) return null;
  return { ...(id !== undefined ? { id } : {}), mainPhotoUrl, title };
}

export function toWhatsappMessage(
  message: CrmWhatsappMessage,
): WhatsappMessage {
  return {
    channel: message.channel,
    content: message.content,
    createdAt: message.createdAt,
    deletedAt: message.deletedAt,
    direction: message.direction,
    externalId: message.externalId,
    id: message.id,
    mediaType: message.mediaType,
    mediaUrl: message.mediaUrl,
    metadata: message.metadata,
    providerTimestamp: message.providerTimestamp,
    senderType: message.senderType,
    status: message.status,
    type: message.type,
    uuid: message.id,
  };
}
