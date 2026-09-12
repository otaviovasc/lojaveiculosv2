import { useCallback, useMemo, useState } from "react";
import {
  coerceConversationCycleFilter,
  filterSessionsForAssignmentQueue,
  filterSessionsForSmartFilters,
} from "./crmQueueState";
import type {
  CrmConversationCycle,
  CrmConversationCycleFilter,
  CrmConversationCycleStatus,
  CrmHumanAttendanceState,
} from "./crmConversationTypes";

export function useCrmQueueAccess({
  canAssign,
  canReadUnassigned = false,
  currentUserId,
  conversationCycles,
  queueConnectionId = null,
  archivedOnly = false,
  humanAttendanceFilter = "",
  statusFilter = "",
  unreadOnly = false,
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
  // Smart-filter scope of the current queue query. The same predicates the
  // server applies must gate preserved/optimistic local cycles so a stale
  // snapshot can never leak into the sidebar; the predicates read the same
  // fields the rows render, so realtime updates re-evaluate correctly.
  archivedOnly?: boolean;
  humanAttendanceFilter?: CrmHumanAttendanceState | "";
  statusFilter?: CrmConversationCycleStatus | "";
  unreadOnly?: boolean;
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
    const smartFiltered = filterSessionsForSmartFilters(scopedCycles, {
      archivedOnly,
      humanAttendanceFilter,
      statusFilter,
      unreadOnly,
    });
    return filterSessionsForAssignmentQueue(
      smartFiltered,
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
    archivedOnly,
    humanAttendanceFilter,
    statusFilter,
    unreadOnly,
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
