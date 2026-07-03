import { useCallback, useMemo, useState } from "react";
import { selectedWhatsappSessions } from "./crmWhatsappQueueState";
import type {
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

type BulkActions = {
  bulkAssignSessions: (
    sessionIds: CrmWhatsappSessionId[],
    assignedUserId: string | null,
  ) => Promise<boolean>;
  bulkCloseSessions: (sessionIds: CrmWhatsappSessionId[]) => Promise<boolean>;
  bulkMarkSessionsRead: (
    sessionIds: CrmWhatsappSessionId[],
  ) => Promise<boolean>;
  bulkMarkSessionsUnread: (
    sessionIds: CrmWhatsappSessionId[],
  ) => Promise<boolean>;
};

export function useCrmWhatsappBulkSelection(
  sessions: CrmWhatsappSession[],
  actions: BulkActions,
) {
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const selectedSessions = useMemo(
    () => selectedWhatsappSessions(sessions, selectedSessionIds),
    [selectedSessionIds, sessions],
  );
  const selectedIds = useMemo(
    () => selectedSessions.map((session) => session.id),
    [selectedSessions],
  );
  const clearSelectedSessions = useCallback(
    () => setSelectedSessionIds([]),
    [],
  );
  const runBulkAction = useCallback(
    async (action: () => Promise<boolean>) => {
      const accepted = await action();
      if (accepted) clearSelectedSessions();
      return accepted;
    },
    [clearSelectedSessions],
  );

  return {
    clearSelectedSessions,
    selectAllVisibleSessions: () =>
      setSelectedSessionIds(sessions.map((session) => String(session.id))),
    selectedSessionIds,
    selectedSessions,
    toggleSelectedSession: (sessionId: CrmWhatsappSessionId) => {
      const value = String(sessionId);
      setSelectedSessionIds((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      );
    },
    actions: {
      bulkAssignSessions: (assignedUserId: string | null) =>
        runBulkAction(() =>
          actions.bulkAssignSessions(selectedIds, assignedUserId),
        ),
      bulkCloseSessions: () =>
        runBulkAction(() => actions.bulkCloseSessions(selectedIds)),
      bulkMarkSessionsRead: () =>
        runBulkAction(() => actions.bulkMarkSessionsRead(selectedIds)),
      bulkMarkSessionsUnread: () =>
        runBulkAction(() => actions.bulkMarkSessionsUnread(selectedIds)),
    },
  };
}
