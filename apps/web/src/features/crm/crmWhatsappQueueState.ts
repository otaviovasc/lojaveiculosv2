import type {
  CrmWhatsappAddSessionTagInput,
  CrmWhatsappSession,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionFilter,
} from "./crmWhatsappTypes";

export type CrmWhatsappBulkActionDraft = {
  assignedUserId?: string | null;
  close?: boolean;
  readState?: "read" | "unread";
  tag?: CrmWhatsappAddSessionTagInput;
};

export const defaultWhatsappSessionCounts: CrmWhatsappSessionCounts = {
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

export function selectedWhatsappSessions(
  sessions: CrmWhatsappSession[],
  selectedIds: readonly string[],
) {
  const ids = new Set(selectedIds.map(String));
  return sessions.filter((session) => ids.has(String(session.id)));
}

export function totalUnreadSessions(sessions: readonly CrmWhatsappSession[]) {
  return sessions.reduce(
    (total, session) => total + (session.unreadCount ?? 0),
    0,
  );
}

export function selectedCountLabel(count: number) {
  return count === 1 ? "1 conversa" : `${count} conversas`;
}

export function countForFilter(
  counts: CrmWhatsappSessionCounts,
  filter: CrmWhatsappSessionFilter,
) {
  return counts.filters[filter] ?? 0;
}

export function coerceWhatsappSessionFilter(
  filter: CrmWhatsappSessionFilter,
  canAssign: boolean,
): CrmWhatsappSessionFilter {
  return canAssign ? filter : "mine";
}

export function filterSessionsForAssignmentQueue(
  sessions: CrmWhatsappSession[],
  filter: CrmWhatsappSessionFilter,
  currentUserId: string | null,
  otherAssigneeId: string | null,
) {
  if (filter === "all") return sessions;
  if (filter === "fresh" || filter === "unassigned") {
    return sessions.filter((session) => !session.assignedUserId);
  }
  if (filter === "mine") {
    return sessions.filter(
      (session) =>
        currentUserId !== null &&
        String(session.assignedUserId ?? "") === String(currentUserId),
    );
  }
  return sessions.filter((session) => {
    const assignedUserId = session.assignedUserId
      ? String(session.assignedUserId)
      : null;
    if (!assignedUserId || assignedUserId === String(currentUserId ?? "")) {
      return false;
    }
    return !otherAssigneeId || assignedUserId === String(otherAssigneeId);
  });
}
