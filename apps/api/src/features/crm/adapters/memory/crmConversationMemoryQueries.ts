import type {
  CrmMessage,
  CrmConversationCycle,
} from "../../../../domains/crm/ports/crmConversationRepository.js";

export function matchesFilter(
  cycle: CrmConversationCycle,
  input: {
    assignedUserId?: string;
    filter?: string;
    selectedAssigneeId?: string;
  },
) {
  if (input.filter === "fresh") {
    return (
      cycle.status === "ACTIVE" &&
      !cycle.assignedUserId &&
      Boolean(cycle.freshLeadAt) &&
      !cycle.firstHandledAt
    );
  }
  if (input.filter === "mine") {
    return Boolean(
      input.assignedUserId && cycle.assignedUserId === input.assignedUserId,
    );
  }
  if (input.filter === "others") {
    return Boolean(
      input.assignedUserId &&
      cycle.assignedUserId &&
      cycle.assignedUserId !== input.assignedUserId &&
      (!input.selectedAssigneeId ||
        cycle.assignedUserId === input.selectedAssigneeId),
    );
  }
  if (input.filter === "unassigned") {
    return (
      !cycle.assignedUserId &&
      (!cycle.freshLeadAt ||
        Boolean(cycle.firstHandledAt) ||
        cycle.status !== "ACTIVE")
    );
  }
  return true;
}

export function withUnreadCount(
  cycle: CrmConversationCycle,
  messages: readonly CrmMessage[],
): CrmConversationCycle {
  const lastReadAt = cycle.lastReadAt?.getTime() ?? 0;
  return {
    ...cycle,
    unreadCount: messages.filter(
      (message) =>
        message.cycleId === cycle.id &&
        message.direction === "INBOUND" &&
        message.createdAt.getTime() > lastReadAt,
    ).length,
  };
}

export function matchesSearch(cycle: CrmConversationCycle, search?: string) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [
    cycle.customerDisplayName,
    cycle.customerPhone,
    cycle.lastMessageContent,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(needle));
}

export function compareCyclesNewestFirst(
  left: CrmConversationCycle,
  right: CrmConversationCycle,
) {
  // Null pinnedAt sorts last, mirroring `pinned_at desc nulls last` in SQL.
  const pinnedDiff = timestamp(right.pinnedAt) - timestamp(left.pinnedAt);
  if (pinnedDiff) return pinnedDiff;
  const lastMessageDiff =
    timestamp(right.lastMessageAt) - timestamp(left.lastMessageAt);
  if (lastMessageDiff) return lastMessageDiff;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function compareMessagesNewestFirst(
  left: CrmMessage,
  right: CrmMessage,
) {
  const providerDiff =
    timestamp(right.providerTimestamp) - timestamp(left.providerTimestamp);
  return providerDiff || timestamp(right.createdAt) - timestamp(left.createdAt);
}

function timestamp(value: Date | null) {
  return value?.getTime() ?? 0;
}
