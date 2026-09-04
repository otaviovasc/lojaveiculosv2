import type {
  CrmAssignableMember,
  CrmMessage,
  CrmSendMediaType,
  CrmConversationCycle,
} from "./crmConversationTypes";

import { formatCrmPhone } from "./crmPhoneFormat";
import { formatLastMessagePreview } from "./crmSentPreview";

export type CrmMessageView = CrmMessage & {
  clientId?: string;
  quotedMessageText?: string;
};

const contactNameParticles = new Set(["da", "das", "de", "do", "dos", "e"]);

export function formatCycleName(cycle: CrmConversationCycle) {
  const name = cycle.customerDisplayName?.trim();
  if (name && name !== ".") return name;
  return cycle.customerPhone
    ? formatCrmPhone(cycle.customerPhone)
    : "Contato sem nome";
}

export function formatContactInitials(name?: string | null) {
  const words = (name ?? "")
    .normalize("NFC")
    .trim()
    .split(/\s+/u)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (!words.length) return "?";
  const meaningfulWords = words.filter(
    (word, index) =>
      index === 0 || !contactNameParticles.has(word.toLocaleLowerCase("pt-BR")),
  );
  const first = Array.from(meaningfulWords[0] ?? "");
  const last = Array.from(meaningfulWords.at(-1) ?? "");
  const initials =
    meaningfulWords.length > 1
      ? `${first[0] ?? ""}${last[0] ?? ""}`
      : first.slice(0, 2).join("");
  return initials.toLocaleUpperCase("pt-BR") || "?";
}

export function formatCycleAvatarInitials(cycle: CrmConversationCycle) {
  const name = cycle.customerDisplayName?.trim();
  return formatContactInitials(name && name !== "." ? name : null);
}

export function formatCyclePreview(cycle: CrmConversationCycle) {
  return (
    formatLastMessagePreview({ content: cycle.lastMessageContent }) ||
    "Sem mensagens recentes"
  );
}

export function formatMessageTime(message: CrmMessage) {
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

export function getCycleReadTimeMs(cycle?: CrmConversationCycle | null) {
  return cycle?.lastReadAt ? new Date(cycle.lastReadAt).getTime() : 0;
}

export function getCycleTimeMs(cycle?: CrmConversationCycle | null) {
  return cycle?.lastMessageAt ? new Date(cycle.lastMessageAt).getTime() : 0;
}

export function mergeCyclesFromServer(
  current: CrmConversationCycle[],
  serverCycles: CrmConversationCycle[],
  options: {
    preserveLocalOnly?: boolean;
    pruneLocalOnly?: (cycle: CrmConversationCycle) => boolean;
    snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
  } = {},
) {
  const currentCyclesById = new Map(current.map((cycle) => [cycle.id, cycle]));
  const serverIds = new Set(serverCycles.map((cycle) => cycle.id));
  const merged = serverCycles.map((serverCycle) => {
    const localCycle = currentCyclesById.get(serverCycle.id);
    if (!localCycle) return serverCycle;
    if (options.snapshotKind === "mutation") {
      return serverCycle;
    }

    const revisionComparison = compareCycleRevisions(localCycle, serverCycle);
    if (revisionComparison < 0) return localCycle;

    const localIsNewer =
      getCycleTimeMs(localCycle) > getCycleTimeMs(serverCycle);
    const localReadIsNewer =
      getCycleReadTimeMs(localCycle) > getCycleReadTimeMs(serverCycle);
    const localAttendanceIsNewer =
      (localCycle.humanAttendanceStateVersion ?? 0) >
      (serverCycle.humanAttendanceStateVersion ?? 0);
    return {
      ...serverCycle,
      ...(localCycle.connection && !serverCycle.connection
        ? { connection: localCycle.connection }
        : {}),
      ...(localIsNewer
        ? {
            lastMessageAt: localCycle.lastMessageAt,
            lastMessageContent: localCycle.lastMessageContent,
            status: localCycle.status,
          }
        : {}),
      ...(localAttendanceIsNewer
        ? {
            humanAttendanceChangedAt:
              localCycle.humanAttendanceChangedAt ?? null,
            humanAttendanceState: localCycle.humanAttendanceState ?? null,
            humanAttendanceStateVersion: localCycle.humanAttendanceStateVersion,
            humanHandlingStartedAt: localCycle.humanHandlingStartedAt ?? null,
            interventionHistoryStartedAt:
              localCycle.interventionHistoryStartedAt ?? null,
            interventionId: localCycle.interventionId ?? null,
            status: localCycle.status,
          }
        : {}),
      unreadCount: localReadIsNewer
        ? (localCycle.unreadCount ?? 0)
        : Math.max(serverCycle.unreadCount ?? 0, localCycle.unreadCount ?? 0),
    };
  });
  const localOnly = options.preserveLocalOnly
    ? current.filter(
        (cycle) => !serverIds.has(cycle.id) && !options.pruneLocalOnly?.(cycle),
      )
    : [];

  return [...merged, ...localOnly].sort(
    (left, right) => getCycleTimeMs(right) - getCycleTimeMs(left),
  );
}

export function mergeMessagesFromServer(
  current: CrmMessageView[],
  serverMessages: CrmMessage[],
) {
  const existingIds = new Set(
    serverMessages.map((message) => String(message.id)),
  );
  const retainedHistory = current.filter(
    (message) =>
      !existingIds.has(String(message.id)) &&
      (!message.clientId || !hasServerEquivalent(serverMessages, message)),
  );

  const next = [...serverMessages, ...retainedHistory].sort(
    (left, right) =>
      new Date(left.providerTimestamp ?? left.createdAt).getTime() -
      new Date(right.providerTimestamp ?? right.createdAt).getTime(),
  );
  return haveSameMessageSnapshot(current, next) ? current : next;
}

export function haveSameMessageSnapshot(
  current: CrmMessageView[],
  next: CrmMessageView[],
) {
  return (
    current.length === next.length &&
    current.every((message, index) => isSameMessageValue(message, next[index]))
  );
}

function isSameMessageValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => isSameMessageValue(value, right[index]))
    );
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        isSameMessageValue(leftRecord[key], rightRecord[key]),
    )
  );
}

function hasServerEquivalent(
  serverMessages: CrmMessage[],
  message: CrmMessage,
) {
  return serverMessages.some(
    (serverMessage) =>
      serverMessage.content === message.content &&
      serverMessage.direction === message.direction &&
      serverMessage.type === message.type,
  );
}

function compareCycleRevisions(
  current: CrmConversationCycle,
  incoming: CrmConversationCycle,
) {
  const currentRevision = readCycleRevision(current);
  const incomingRevision = readCycleRevision(incoming);
  if (currentRevision === null && incomingRevision === null) return 0;
  if (currentRevision === null) return 1;
  if (incomingRevision === null) return -1;
  return incomingRevision - currentRevision;
}

export function readCycleRevision(cycle: CrmConversationCycle) {
  return typeof cycle.revision === "number" &&
    Number.isSafeInteger(cycle.revision) &&
    cycle.revision >= 0
    ? cycle.revision
    : null;
}

export function createOptimisticTextMessage(
  text: string,
  metadata?: Record<string, unknown>,
): CrmMessageView {
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
}): CrmMessageView {
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
  mediaType: CrmSendMediaType;
  mimeType?: string;
}): CrmMessageView {
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
  mediaType: CrmSendMediaType;
}) {
  if (input.caption?.trim()) return input.caption.trim();
  if (input.mediaType === "document") return input.fileName ?? "Documento";
  if (input.mediaType === "image") return "[image]";
  return input.mediaType === "video" ? "[video]" : "[audio]";
}

function mediaMessageType(mediaType: CrmSendMediaType) {
  if (mediaType === "image") return "IMAGE";
  if (mediaType === "audio") return "AUDIO";
  return mediaType === "video" ? "VIDEO" : "DOCUMENT";
}

export function getSenderLabel(
  message: CrmMessage,
  _fallbackAssigneeName?: string | null,
) {
  if (message.direction === "INBOUND") {
    return null;
  }
  if (message.senderType === "AI") return "IA";
  if (message.senderType === "SYSTEM") return "Sistema";
  if (message.senderOrigin === "external_bot") return "Bot externo";
  if (message.senderOrigin === "human_channel") {
    return "Enviado diretamente pelo canal";
  }
  if (message.senderType === "HUMAN" && message.senderOrigin === "human_crm") {
    const senderUser = readSenderUser(message);
    const senderName = senderUser?.name.trim();
    return senderName ? `Atendente · ${senderName}` : "Atendente removido";
  }
  return null;
}

function readSenderUser(message: CrmMessage) {
  const value = (
    message as CrmMessage & {
      senderUser?: { id: string; name: string } | null;
    }
  ).senderUser;
  return value && typeof value.name === "string" ? value : null;
}

export function getSenderOriginLabel(message: CrmMessage) {
  if (message.direction === "INBOUND") {
    return null;
  }
  switch (message.senderOrigin ?? "unknown") {
    case "human_channel":
      return "Enviado diretamente pelo canal";
    case "external_bot":
      return "Bot externo";
    case "customer":
    case "human_crm":
    case "system":
    case "unknown":
    default:
      return null;
  }
}

export function canAssign(member: CrmAssignableMember) {
  return member.isActive;
}
