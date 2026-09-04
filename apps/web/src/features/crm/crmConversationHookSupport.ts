import type {
  CrmConnectionId,
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";
import type { CrmConversationApi } from "./crmConversationApi";
import { readCrmConversationCycleIdFromHash } from "./crmRouteState";

export function asError(caught: unknown) {
  return caught instanceof Error ? caught : new Error(String(caught));
}

export function readInitialCycleId(): CrmConversationCycleId | null {
  if (typeof window === "undefined") return null;
  return readCrmConversationCycleIdFromHash(window.location.hash);
}

export function createConnectionQuery(connectionId: CrmConnectionId | null) {
  return connectionId ? { connectionId } : {};
}

export async function loadDeepLinkedCycle(
  api: Pick<CrmConversationApi, "listConversationCycles">,
  cycleId: CrmConversationCycleId,
): Promise<CrmConversationCycle | null> {
  const conversationCycles = await api.listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId,
  });
  return conversationCycles[0] ?? null;
}
