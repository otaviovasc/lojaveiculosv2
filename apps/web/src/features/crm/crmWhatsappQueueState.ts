import type {
  CrmWhatsappSession,
  CrmWhatsappSessionCounts,
  CrmWhatsappSessionFilter,
  CrmWhatsappStatus,
} from "./crmWhatsappTypes";

export const whatsappStatusOptions: Array<{
  label: string;
  value: CrmWhatsappStatus | "";
}> = [
  { label: "Todos os status", value: "" },
  { label: "Ativas", value: "ACTIVE" },
  { label: "Intervencao", value: "HUMAN_TAKEOVER" },
  { label: "Minibot", value: "MINIBOT_ACTIVE" },
  { label: "Concluidas", value: "COMPLETED" },
  { label: "Expiradas", value: "EXPIRED" },
];

export const defaultWhatsappSessionCounts: CrmWhatsappSessionCounts = {
  filters: {
    all: 0,
    fresh: 0,
    mine: 0,
    others: 0,
    unassigned: 0,
  },
  statuses: {
    ACTIVE: 0,
    COMPLETED: 0,
    EXPIRED: 0,
    HUMAN_TAKEOVER: 0,
    MINIBOT_ACTIVE: 0,
  },
  total: 0,
  unread: 0,
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
