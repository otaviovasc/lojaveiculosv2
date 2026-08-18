import { useCallback, useMemo, useState } from "react";
import { selectedConversationCycles } from "./crmQueueState";
import type { CrmBulkActionDraft } from "./crmQueueState";
import type {
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";

type BulkActions = {
  bulkApplySessions: (
    cycleIds: CrmConversationCycleId[],
    draft: CrmBulkActionDraft,
  ) => Promise<boolean>;
  bulkAssignSessions: (
    cycleIds: CrmConversationCycleId[],
    assignedUserId: string | null,
  ) => Promise<boolean>;
  bulkCloseSessions: (cycleIds: CrmConversationCycleId[]) => Promise<boolean>;
  bulkMarkSessionsRead: (
    cycleIds: CrmConversationCycleId[],
  ) => Promise<boolean>;
  bulkMarkSessionsUnread: (
    cycleIds: CrmConversationCycleId[],
  ) => Promise<boolean>;
};

export function useCrmBulkSelection(
  conversationCycles: CrmConversationCycle[],
  actions: BulkActions,
) {
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
  const selectedSessions = useMemo(
    () => selectedConversationCycles(conversationCycles, selectedCycleIds),
    [selectedCycleIds, conversationCycles],
  );
  const selectedIds = useMemo(
    () => selectedSessions.map((cycle) => cycle.id),
    [selectedSessions],
  );
  const clearSelectedSessions = useCallback(() => setSelectedCycleIds([]), []);
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
      setSelectedCycleIds(conversationCycles.map((cycle) => String(cycle.id))),
    selectedCycleIds,
    selectedSessions,
    toggleSelectedSession: (cycleId: CrmConversationCycleId) => {
      const value = String(cycleId);
      setSelectedCycleIds((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      );
    },
    actions: {
      bulkApplySessions: (draft: CrmBulkActionDraft) =>
        runBulkAction(() => actions.bulkApplySessions(selectedIds, draft)),
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
