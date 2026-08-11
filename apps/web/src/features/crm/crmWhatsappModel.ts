import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappMessage,
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappSendMediaType,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export type WhatsappMessageView = CrmWhatsappMessage & {
  clientId?: string;
  quotedMessageText?: string;
};

const senderOrigins = new Set<CrmWhatsappMessageSenderOrigin>([
  "customer",
  "human_crm",
  "human_whatsapp",
  "bot_api",
  "system",
  "unknown",
]);

export function parseCrmWhatsappSession(value: unknown): CrmWhatsappSession {
  const record = asRecord(value);
  return {
    ...(record as CrmWhatsappSession),
    interventionHistoryStartedAt: readNullableString(
      record.interventionHistoryStartedAt,
    ),
    revision: readSafeRevision(record.revision),
  };
}

export function parseCrmWhatsappMessage(value: unknown): CrmWhatsappMessage {
  const record = asRecord(value);
  return {
    ...(record as CrmWhatsappMessage),
    senderOrigin: readSenderOrigin(record.senderOrigin),
  };
}

export function parseCrmWhatsappSessions(value: unknown): CrmWhatsappSession[] {
  return Array.isArray(value) ? value.map(parseCrmWhatsappSession) : [];
}

export function parseCrmWhatsappMessages(value: unknown): CrmWhatsappMessage[] {
  return Array.isArray(value) ? value.map(parseCrmWhatsappMessage) : [];
}

export function formatSessionName(session: CrmWhatsappSession) {
  const name = session.buyerName?.trim();
  if (name && name !== ".") return name;
  return session.buyerPhone ?? "Contato sem nome";
}

export function formatSessionPreview(session: CrmWhatsappSession) {
  return session.lastMessageContent?.trim() || "Sem mensagens recentes";
}

export function formatMessageTime(message: CrmWhatsappMessage) {
  const value = message.providerTimestamp ?? message.createdAt;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
  });
}

export function formatRelativeSessionTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function getSessionReadTimeMs(session?: CrmWhatsappSession | null) {
  return session?.lastReadAt ? new Date(session.lastReadAt).getTime() : 0;
}

export function getSessionTimeMs(session?: CrmWhatsappSession | null) {
  return session?.lastMessageAt ? new Date(session.lastMessageAt).getTime() : 0;
}

export function mergeSessionsFromServer(
  current: CrmWhatsappSession[],
  serverSessions: CrmWhatsappSession[],
  options: { preserveLocalOnly?: boolean } = {},
) {
  const currentById = new Map(current.map((session) => [session.id, session]));
  const serverIds = new Set(serverSessions.map((session) => session.id));
  const merged = serverSessions.map((serverSession) => {
    const localSession = currentById.get(serverSession.id);
    if (!localSession) return serverSession;

    const revisionComparison = compareSessionRevisions(
      localSession,
      serverSession,
    );
    if (revisionComparison < 0) return localSession;

    const localIsNewer =
      getSessionTimeMs(localSession) > getSessionTimeMs(serverSession);
    const localReadIsNewer =
      getSessionReadTimeMs(localSession) > getSessionReadTimeMs(serverSession);
    const localAttendanceIsNewer =
      (localSession.humanAttendanceStateVersion ?? 0) >
      (serverSession.humanAttendanceStateVersion ?? 0);
    return {
      ...serverSession,
      ...(localIsNewer
        ? {
            lastMessageAt: localSession.lastMessageAt,
            lastMessageContent: localSession.lastMessageContent,
            status: localSession.status,
          }
        : {}),
      ...(localAttendanceIsNewer
        ? {
            humanAttendanceChangedAt:
              localSession.humanAttendanceChangedAt ?? null,
            humanAttendanceState: localSession.humanAttendanceState ?? null,
            humanAttendanceStateVersion:
              localSession.humanAttendanceStateVersion,
            humanHandlingStartedAt: localSession.humanHandlingStartedAt ?? null,
            interventionHistoryStartedAt:
              localSession.interventionHistoryStartedAt ?? null,
            interventionId: localSession.interventionId ?? null,
            status: localSession.status,
          }
        : {}),
      unreadCount: localReadIsNewer
        ? (localSession.unreadCount ?? 0)
        : Math.max(
            serverSession.unreadCount ?? 0,
            localSession.unreadCount ?? 0,
          ),
    };
  });
  const localOnly = options.preserveLocalOnly
    ? current.filter((session) => !serverIds.has(session.id))
    : [];

  return [...merged, ...localOnly].sort(
    (left, right) => getSessionTimeMs(right) - getSessionTimeMs(left),
  );
}

export function mergeMessagesFromServer(
  current: WhatsappMessageView[],
  serverMessages: CrmWhatsappMessage[],
) {
  const existingIds = new Set(
    serverMessages.map((message) => String(message.id)),
  );
  const localEchoes = current.filter(
    (message) =>
      Boolean(message.clientId) &&
      !existingIds.has(String(message.id)) &&
      !hasServerEquivalent(serverMessages, message),
  );

  return [...serverMessages, ...localEchoes].sort(
    (left, right) =>
      new Date(left.providerTimestamp ?? left.createdAt).getTime() -
      new Date(right.providerTimestamp ?? right.createdAt).getTime(),
  );
}

function hasServerEquivalent(
  serverMessages: CrmWhatsappMessage[],
  message: CrmWhatsappMessage,
) {
  return serverMessages.some(
    (serverMessage) =>
      serverMessage.content === message.content &&
      serverMessage.direction === message.direction &&
      serverMessage.type === message.type,
  );
}

function compareSessionRevisions(
  current: CrmWhatsappSession,
  incoming: CrmWhatsappSession,
) {
  const currentRevision = readSessionRevision(current);
  const incomingRevision = readSessionRevision(incoming);
  if (currentRevision === null && incomingRevision === null) return 0;
  if (currentRevision === null) return 1;
  if (incomingRevision === null) return -1;
  return incomingRevision - currentRevision;
}

export function readSessionRevision(session: CrmWhatsappSession) {
  return typeof session.revision === "number" &&
    Number.isSafeInteger(session.revision) &&
    session.revision >= 0
    ? session.revision
    : null;
}

function readSafeRevision(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function readSenderOrigin(value: unknown): CrmWhatsappMessageSenderOrigin {
  return typeof value === "string" && senderOrigins.has(value as never)
    ? (value as CrmWhatsappMessageSenderOrigin)
    : "unknown";
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function createOptimisticTextMessage(
  text: string,
  metadata?: Record<string, unknown>,
): WhatsappMessageView {
  const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    clientId,
    content: text,
    createdAt: new Date().toISOString(),
    direction: "OUTBOUND",
    id: clientId,
    ...(metadata ? { metadata } : {}),
    senderOrigin: "human_crm",
    senderType: "HUMAN",
    status: "PENDING",
    type: "TEXT",
  };
}

export function createOptimisticStructuredMessage(input: {
  content: string;
  metadata?: Record<string, unknown>;
  type: "CATALOG" | "LOCATION";
}): WhatsappMessageView {
  const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    clientId,
    content: input.content,
    createdAt: new Date().toISOString(),
    direction: "OUTBOUND",
    id: clientId,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    senderOrigin: "human_crm",
    senderType: "HUMAN",
    status: "PENDING",
    type: input.type,
  };
}

export function createOptimisticMediaMessage(input: {
  caption?: string;
  fileName?: string;
  localUrl: string;
  mediaType: CrmWhatsappSendMediaType;
  mimeType?: string;
}): WhatsappMessageView {
  const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    clientId,
    content: optimisticMediaContent(input),
    createdAt: new Date().toISOString(),
    direction: "OUTBOUND",
    id: clientId,
    mediaType: input.mediaType,
    mediaUrl: input.localUrl,
    metadata: {
      media: {
        ...(input.mediaType === "video"
          ? { videoProcessingStage: "UPLOADING" }
          : {}),
        ...(input.caption ? { caption: input.caption } : {}),
        ...(input.fileName ? { fileName: input.fileName } : {}),
        ...(input.mimeType ? { mimeType: input.mimeType } : {}),
      },
    },
    senderOrigin: "human_crm",
    senderType: "HUMAN",
    status: "PENDING",
    type: mediaMessageType(input.mediaType),
  };
}

function optimisticMediaContent(input: {
  caption?: string;
  fileName?: string;
  mediaType: CrmWhatsappSendMediaType;
}) {
  if (input.caption?.trim()) return input.caption.trim();
  if (input.mediaType === "document") return input.fileName ?? "Documento";
  if (input.mediaType === "image") return "[image]";
  return input.mediaType === "video" ? "[video]" : "[audio]";
}

function mediaMessageType(mediaType: CrmWhatsappSendMediaType) {
  if (mediaType === "image") return "IMAGE";
  if (mediaType === "audio") return "AUDIO";
  return mediaType === "video" ? "VIDEO" : "DOCUMENT";
}

export function getSenderLabel(message: CrmWhatsappMessage) {
  const metadata = message.metadata ?? {};
  if (typeof metadata.authorName === "string") return metadata.authorName;
  if (message.senderType === "AI") return "IA";
  if (message.senderType === "SYSTEM") return "Sistema";
  if (message.direction === "OUTBOUND") return "Atendente";
  return null;
}

export function getSenderOriginLabel(message: CrmWhatsappMessage) {
  switch (message.senderOrigin ?? "unknown") {
    case "customer":
      return "Cliente";
    case "human_crm":
      return "Atendente CRM";
    case "human_whatsapp":
      return "Atendente no WhatsApp";
    case "bot_api":
      return "Bot/API";
    case "system":
      return "Sistema";
    case "unknown":
    default:
      return "Origem desconhecida";
  }
}

export function canAssign(member: CrmWhatsappAssignableMember) {
  return member.isActive;
}
