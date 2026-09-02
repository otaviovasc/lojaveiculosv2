import { useCallback, useRef, useState, type MutableRefObject } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import { defaultConversationCycleCounts } from "./crmQueueState";
import type {
  CrmConnectionId,
  CrmHumanAttendanceState,
  CrmConversationCycleFilter,
  CrmConversationCycleStatus,
} from "./crmConversationTypes";

export function useCrmConversationCycleCounts({
  api,
  canList,
  connectionId,
  humanAttendanceFilter,
  quickFilter,
  searchRef,
  selectedTagIds,
  statusFilter,
  storeWide = false,
  unreadOnly,
}: {
  api: CrmConversationApi;
  canList: boolean;
  connectionId: CrmConnectionId | null;
  humanAttendanceFilter: CrmHumanAttendanceState | "";
  quickFilter: CrmConversationCycleFilter;
  searchRef: MutableRefObject<string>;
  selectedTagIds: string[];
  statusFilter: CrmConversationCycleStatus | "";
  /** Store-wide counts (aggregate connection filter): omit connectionId. */
  storeWide?: boolean;
  unreadOnly: boolean;
}) {
  const [conversationCycleCounts, setSessionCounts] = useState(
    defaultConversationCycleCounts,
  );
  const requestGenerationRef = useRef(0);
  const refreshSessionCounts = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    if ((!connectionId && !storeWide) || !canList) {
      setSessionCounts(defaultConversationCycleCounts);
      return;
    }
    const counts = await api.listConversationCycleCounts({
      ...(connectionId ? { connectionId } : {}),
      filter: quickFilter,
      ...(humanAttendanceFilter
        ? { humanAttendanceState: humanAttendanceFilter }
        : {}),
      ...(searchRef.current ? { search: searchRef.current } : {}),
      ...(selectedTagIds.length ? { tagIds: selectedTagIds } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(unreadOnly ? { unreadOnly } : {}),
    });
    if (requestGeneration !== requestGenerationRef.current) return;
    setSessionCounts(counts);
  }, [
    api,
    canList,
    connectionId,
    humanAttendanceFilter,
    quickFilter,
    searchRef,
    selectedTagIds,
    statusFilter,
    storeWide,
    unreadOnly,
  ]);

  return { refreshSessionCounts, conversationCycleCounts };
}
