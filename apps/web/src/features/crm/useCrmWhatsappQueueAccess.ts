import { useCallback, useMemo, useState } from "react";
import {
  coerceWhatsappSessionFilter,
  filterSessionsForAssignmentQueue,
} from "./crmWhatsappQueueState";
import type {
  CrmWhatsappSession,
  CrmWhatsappSessionFilter,
} from "./crmWhatsappTypes";

export function useCrmWhatsappQueueAccess({
  canAssign,
  currentUserId,
  sessions,
}: {
  canAssign: boolean;
  currentUserId: string | null;
  sessions: CrmWhatsappSession[];
}) {
  const [requestedFilter, setRequestedFilter] =
    useState<CrmWhatsappSessionFilter>("fresh");
  const [requestedAssigneeId, setRequestedAssigneeId] = useState<string | null>(
    null,
  );
  const quickFilter = coerceWhatsappSessionFilter(requestedFilter, canAssign);
  const otherAssigneeId = canAssign ? requestedAssigneeId : null;
  const visibleSessions = useMemo(
    () =>
      filterSessionsForAssignmentQueue(
        sessions,
        quickFilter,
        currentUserId,
        otherAssigneeId,
      ),
    [currentUserId, otherAssigneeId, quickFilter, sessions],
  );
  const setQuickFilter = useCallback(
    (filter: CrmWhatsappSessionFilter) => {
      const nextFilter = coerceWhatsappSessionFilter(filter, canAssign);
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
