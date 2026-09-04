import type {
  CrmAddConversationCycleTagInput,
  CrmConversationCycle,
  CrmConversationCycleCounts,
  CrmConversationCycleFilter,
} from "./crmConversationTypes";

export type CrmBulkActionDraft = {
  assignedUserId?: string | null;
  close?: boolean;
  readState?: "read" | "unread";
  tag?: CrmAddConversationCycleTagInput;
};

export const defaultConversationCycleCounts: CrmConversationCycleCounts = {
  assignees: [],
  filters: {
    all: 0,
    fresh: 0,
    mine: 0,
    others: 0,
    unassigned: 0,
  },
  inHumanService: 0,
  statuses: {
    ACTIVE: 0,
    COMPLETED: 0,
    EXPIRED: 0,
    HUMAN_TAKEOVER: 0,
    MINIBOT_ACTIVE: 0,
  },
  total: 0,
  unread: 0,
  waitingHuman: 0,
};

export function selectedConversationCycles(
  conversationCycles: CrmConversationCycle[],
  selectedIds: readonly string[],
) {
  const ids = new Set(selectedIds.map(String));
  return conversationCycles.filter((cycle) => ids.has(String(cycle.id)));
}

export function totalUnreadCycles(
  conversationCycles: readonly CrmConversationCycle[],
) {
  return conversationCycles.reduce(
    (total, cycle) => total + (cycle.unreadCount ?? 0),
    0,
  );
}

export function selectedCountLabel(count: number) {
  return count === 1 ? "1 conversa" : `${count} conversas`;
}

export function countForFilter(
  counts: CrmConversationCycleCounts,
  filter: CrmConversationCycleFilter,
) {
  return counts.filters[filter] ?? 0;
}

export function coerceConversationCycleFilter(
  filter: CrmConversationCycleFilter,
  canAssign: boolean,
): CrmConversationCycleFilter {
  return canAssign ? filter : "mine";
}

type CrmConnectionMembershipView = {
  memberUserIds?: readonly string[] | null | undefined;
};

/**
 * Mirrors the server connection-scoped queue visibility: actors with global
 * queue visibility (assign or read_unassigned) browse every connection;
 * restricted agents only browse connections whose member list contains them.
 * Connections without a member list (absent/empty) are not member connections,
 * so restricted agents cannot browse them — matching the server rule that a
 * restricted actor's scoped visibility only includes their member connections.
 */
export function filterConnectionsBrowsableByUser<
  T extends CrmConnectionMembershipView,
>(
  connections: readonly T[],
  input: {
    canAssign: boolean;
    canReadUnassigned: boolean;
    currentUserId: string | null;
  },
): T[] {
  if (input.canAssign || input.canReadUnassigned) return [...connections];
  const currentUserId = input.currentUserId
    ? String(input.currentUserId)
    : null;
  return connections.filter((connection) => {
    const members = connection.memberUserIds;
    if (!members || members.length === 0 || !currentUserId) return false;
    return members.some((memberId) => String(memberId) === currentUserId);
  });
}

export function filterSessionsForAssignmentQueue(
  conversationCycles: CrmConversationCycle[],
  filter: CrmConversationCycleFilter,
  currentUserId: string | null,
  otherAssigneeId: string | null,
) {
  if (filter === "all") return conversationCycles;
  if (filter === "fresh" || filter === "unassigned") {
    return conversationCycles.filter((cycle) => !cycle.assignedUserId);
  }
  if (filter === "mine") {
    return conversationCycles.filter(
      (cycle) =>
        currentUserId !== null &&
        String(cycle.assignedUserId ?? "") === String(currentUserId),
    );
  }
  return conversationCycles.filter((cycle) => {
    const assignedUserId = cycle.assignedUserId
      ? String(cycle.assignedUserId)
      : null;
    if (!assignedUserId || assignedUserId === String(currentUserId ?? "")) {
      return false;
    }
    return !otherAssigneeId || assignedUserId === String(otherAssigneeId);
  });
}
