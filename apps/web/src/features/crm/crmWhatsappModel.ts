import {
  type CrmWhatsappAgent,
  type CrmWhatsappConnection,
  type CrmWhatsappMessage,
  type CrmWhatsappSession,
  defaultWhatsappScope,
} from "./crmWhatsappTypes";
import type { CrmWhatsappBootstrap } from "./crmWhatsappApi";

export type WhatsappMessageView = CrmWhatsappMessage & {
  clientId?: string;
  quotedMessageText?: string;
};

export function normalizeBootstrap(payload: CrmWhatsappBootstrap) {
  return {
    agents: Array.isArray(payload.agents)
      ? payload.agents
      : payload.agents.agents,
    connections: Array.isArray(payload.connections)
      ? payload.connections
      : payload.connections.connections,
    scope: payload.scope ?? defaultWhatsappScope,
  };
}

export function hasConnectedWhatsapp(connections: CrmWhatsappConnection[]) {
  return connections.some((connection) => connection.status === "CONNECTED");
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
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeSessionTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
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

    const localIsNewer =
      getSessionTimeMs(localSession) > getSessionTimeMs(serverSession);
    const localReadIsNewer =
      getSessionReadTimeMs(localSession) > getSessionReadTimeMs(serverSession);
    return {
      ...serverSession,
      ...(localIsNewer
        ? {
            lastMessageAt: localSession.lastMessageAt,
            lastMessageContent: localSession.lastMessageContent,
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
  const pending = current.filter(
    (message) =>
      message.status === "PENDING" &&
      !existingIds.has(String(message.id)) &&
      !serverMessages.some(
        (serverMessage) =>
          serverMessage.content === message.content &&
          serverMessage.direction === message.direction &&
          serverMessage.type === message.type,
      ),
  );

  return [...serverMessages, ...pending].sort(
    (left, right) =>
      new Date(left.providerTimestamp ?? left.createdAt).getTime() -
      new Date(right.providerTimestamp ?? right.createdAt).getTime(),
  );
}

export function createOptimisticTextMessage(text: string): WhatsappMessageView {
  const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    clientId,
    content: text,
    createdAt: new Date().toISOString(),
    direction: "OUTBOUND",
    id: clientId,
    senderType: "HUMAN",
    status: "PENDING",
    type: "TEXT",
  };
}

export function getSenderLabel(message: CrmWhatsappMessage) {
  const metadata = message.metadata ?? {};
  if (typeof metadata.authorName === "string") return metadata.authorName;
  if (typeof metadata.senderAgentName === "string")
    return metadata.senderAgentName;
  if (message.senderType === "AI") return "IA";
  if (message.senderType === "SYSTEM") return "Sistema";
  if (message.direction === "OUTBOUND") return "Atendente";
  return null;
}

export function canAssign(agent: CrmWhatsappAgent) {
  return agent.isActive;
}
