import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export function matchesFilter(
  session: CrmWhatsappSession,
  input: { assignedUserId?: string; filter?: string },
) {
  if (input.filter === "fresh") {
    return (
      session.status === "ACTIVE" &&
      !session.assignedUserId &&
      Boolean(session.freshLeadAt) &&
      !session.firstHandledAt
    );
  }
  if (input.filter === "mine") {
    return Boolean(
      input.assignedUserId && session.assignedUserId === input.assignedUserId,
    );
  }
  if (input.filter === "others") {
    return Boolean(
      input.assignedUserId &&
      session.assignedUserId &&
      session.assignedUserId !== input.assignedUserId,
    );
  }
  if (input.filter === "unassigned") {
    return (
      !session.assignedUserId &&
      (!session.freshLeadAt ||
        Boolean(session.firstHandledAt) ||
        session.status !== "ACTIVE")
    );
  }
  return true;
}

export function withUnreadCount(
  session: CrmWhatsappSession,
  messages: readonly CrmWhatsappMessage[],
): CrmWhatsappSession {
  const lastReadAt = session.lastReadAt?.getTime() ?? 0;
  return {
    ...session,
    unreadCount: messages.filter(
      (message) =>
        message.sessionId === session.id &&
        message.direction === "INBOUND" &&
        message.createdAt.getTime() > lastReadAt,
    ).length,
  };
}

export function matchesSearch(session: CrmWhatsappSession, search?: string) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [session.buyerName, session.buyerPhone, session.lastMessageContent]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle));
}

export function compareSessionsNewestFirst(
  left: CrmWhatsappSession,
  right: CrmWhatsappSession,
) {
  return timestamp(right.lastMessageAt) - timestamp(left.lastMessageAt);
}

export function compareMessagesNewestFirst(
  left: CrmWhatsappMessage,
  right: CrmWhatsappMessage,
) {
  const providerDiff =
    timestamp(right.providerTimestamp) - timestamp(left.providerTimestamp);
  return providerDiff || timestamp(right.createdAt) - timestamp(left.createdAt);
}

function timestamp(value: Date | null) {
  return value?.getTime() ?? 0;
}
