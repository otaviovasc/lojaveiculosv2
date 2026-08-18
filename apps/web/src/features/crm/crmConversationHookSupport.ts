import type {
  CrmConnectionId,
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";
import type { CrmConversationApi } from "./crmConversationApi";

export function asError(caught: unknown) {
  return caught instanceof Error ? caught : new Error(String(caught));
}

export function readInitialCycleId(): CrmConversationCycleId | null {
  if (typeof window === "undefined") return null;
  const query = window.location.hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const raw = (params.get("cycleId") ?? params.get("crm_session"))?.trim();
  if (!raw) return null;
  return raw;
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
