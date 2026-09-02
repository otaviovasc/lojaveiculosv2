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
}: {
  canAssign: boolean;
  canReadUnassigned?: boolean;
  currentUserId: string | null;
  conversationCycles: CrmConversationCycle[];
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
  const visibleSessions = useMemo(
    () =>
      filterSessionsForAssignmentQueue(
        conversationCycles,
        quickFilter,
        currentUserId,
        otherAssigneeId,
      ),
    [currentUserId, otherAssigneeId, quickFilter, conversationCycles],
  );
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
