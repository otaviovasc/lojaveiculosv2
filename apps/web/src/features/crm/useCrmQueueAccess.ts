import { useCallback, useMemo, useState } from "react";
import {
  coerceConversationCycleFilter,
  filterSessionsForAssignmentQueue,
} from "./crmQueueState";
import type {
  CrmConversationCycle,
  CrmConversationCycleFilter,
} from "./crmConversationTypes";

export function useCrmQueueAccess({
  canAssign,
  canReadUnassigned = false,
  currentUserId,
  conversationCycles,
  queueConnectionId = null,
}: {
  canAssign: boolean;
  canReadUnassigned?: boolean;
  currentUserId: string | null;
  conversationCycles: CrmConversationCycle[];
  // Connection scope of the current queue query. Cycles kept in local state
  // from other connections (preserved merges, realtime snapshots) must not
  // leak into the sidebar when the query is connection-scoped. Cycles without
  // a hydrated connection are kept because we cannot prove they belong
  // elsewhere.
  queueConnectionId?: string | null;
}) {
  const [requestedFilter, setRequestedFilter] =
    useState<CrmConversationCycleFilter>("fresh");
  const [requestedAssigneeId, setRequestedAssigneeId] = useState<string | null>(
    null,
  );
  // Mirrors server resolveCrmQueueVisibility: global queue visibility comes
  // from crm.conversations.assign OR crm.conversations.read_unassigned.
  const canBrowseAll = canAssign || canReadUnassigned;
  const quickFilter = coerceConversationCycleFilter(
    requestedFilter,
    canBrowseAll,
  );
  const otherAssigneeId = canBrowseAll ? requestedAssigneeId : null;
  const visibleSessions = useMemo(() => {
    const scopedCycles = queueConnectionId
      ? conversationCycles.filter(
          (cycle) =>
            !cycle.connection?.id ||
            String(cycle.connection.id) === queueConnectionId,
        )
      : conversationCycles;
    return filterSessionsForAssignmentQueue(
      scopedCycles,
      quickFilter,
      currentUserId,
      otherAssigneeId,
    );
  }, [
    currentUserId,
    otherAssigneeId,
    quickFilter,
    conversationCycles,
    queueConnectionId,
  ]);
  const setQuickFilter = useCallback(
    (filter: CrmConversationCycleFilter) => {
      const nextFilter = coerceConversationCycleFilter(filter, canBrowseAll);
      setRequestedFilter(nextFilter);
      if (nextFilter !== "others") setRequestedAssigneeId(null);
    },
    [canBrowseAll],
  );
  const setOtherAssigneeId = useCallback(
    (assigneeId: string | null) => {
      if (canBrowseAll) setRequestedAssigneeId(assigneeId);
    },
    [canBrowseAll],
  );

  return {
    otherAssigneeId,
    quickFilter,
    setOtherAssigneeId,
    setQuickFilter,
    visibleSessions,
  };
}
