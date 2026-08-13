import { useCallback, useRef, useState, type MutableRefObject } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { defaultWhatsappSessionCounts } from "./crmWhatsappQueueState";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappHumanAttendanceState,
  CrmWhatsappSessionFilter,
  CrmWhatsappStatus,
} from "./crmWhatsappTypes";

export function useCrmWhatsappSessionCounts({
  api,
  canList,
  connectionId,
  humanAttendanceFilter,
  quickFilter,
  searchRef,
  selectedTagIds,
  statusFilter,
  unreadOnly,
}: {
  api: CrmWhatsappApi;
  canList: boolean;
  connectionId: CrmWhatsappConnectionId | null;
  humanAttendanceFilter: CrmWhatsappHumanAttendanceState | "";
  quickFilter: CrmWhatsappSessionFilter;
  searchRef: MutableRefObject<string>;
  selectedTagIds: string[];
  statusFilter: CrmWhatsappStatus | "";
  unreadOnly: boolean;
}) {
  const [sessionCounts, setSessionCounts] = useState(
    defaultWhatsappSessionCounts,
  );
  const requestGenerationRef = useRef(0);
  const refreshSessionCounts = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    if (!connectionId || !canList) {
      setSessionCounts(defaultWhatsappSessionCounts);
      return;
    }
    const counts = await api.listSessionCounts({
      connectionId,
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
    unreadOnly,
  ]);

  return { refreshSessionCounts, sessionCounts };
}
