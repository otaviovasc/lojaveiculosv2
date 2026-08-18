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
  currentUserId,
  conversationCycles,
}: {
  canAssign: boolean;
  currentUserId: string | null;
  conversationCycles: CrmConversationCycle[];
}) {
  const [requestedFilter, setRequestedFilter] =
    useState<CrmConversationCycleFilter>("fresh");
  const [requestedAssigneeId, setRequestedAssigneeId] = useState<string | null>(
    null,
  );
  const quickFilter = coerceConversationCycleFilter(requestedFilter, canAssign);
  const otherAssigneeId = canAssign ? requestedAssigneeId : null;
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
      const nextFilter = coerceConversationCycleFilter(filter, canAssign);
      setRequestedFilter(nextFilter);
      if (nextFilter !== "others") setRequestedAssigneeId(null);
    },
    [canAssign],
  );
  const setOtherAssigneeId = useCallback(
    (assigneeId: string | null) => {
      if (canAssign) setRequestedAssigneeId(assigneeId);
    },
    [canAssign],
  );

  return {
    otherAssigneeId,
    quickFilter,
    setOtherAssigneeId,
    setQuickFilter,
    visibleSessions,
  };
}
