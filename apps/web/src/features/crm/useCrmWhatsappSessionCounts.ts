import { useCallback, useState, type MutableRefObject } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { defaultWhatsappSessionCounts } from "./crmWhatsappQueueState";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappSessionFilter,
  CrmWhatsappStatus,
} from "./crmWhatsappTypes";

export function useCrmWhatsappSessionCounts({
  api,
  canList,
  connectionId,
  quickFilter,
  searchRef,
  selectedTagIds,
  statusFilter,
  unreadOnly,
}: {
  api: CrmWhatsappApi;
  canList: boolean;
  connectionId: CrmWhatsappConnectionId | null;
  quickFilter: CrmWhatsappSessionFilter;
  searchRef: MutableRefObject<string>;
  selectedTagIds: string[];
  statusFilter: CrmWhatsappStatus | "";
  unreadOnly: boolean;
}) {
  const [sessionCounts, setSessionCounts] = useState(
    defaultWhatsappSessionCounts,
  );
  const refreshSessionCounts = useCallback(async () => {
    if (!connectionId || !canList) {
      setSessionCounts(defaultWhatsappSessionCounts);
      return;
    }
    const counts = await api.listSessionCounts({
      connectionId,
      filter: quickFilter,
      ...(searchRef.current ? { search: searchRef.current } : {}),
      ...(selectedTagIds.length ? { tagIds: selectedTagIds } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(unreadOnly ? { unreadOnly } : {}),
    });
    setSessionCounts(counts);
  }, [
    api,
    canList,
    connectionId,
    quickFilter,
    searchRef,
    selectedTagIds,
    statusFilter,
    unreadOnly,
  ]);

  return { refreshSessionCounts, sessionCounts };
}
