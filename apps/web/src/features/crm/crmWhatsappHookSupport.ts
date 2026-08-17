import type {
  CrmWhatsappConnectionId,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";
import type { CrmWhatsappApi } from "./crmWhatsappApi";

export function asError(caught: unknown) {
  return caught instanceof Error ? caught : new Error(String(caught));
}

export function readInitialSessionId(): CrmWhatsappSessionId | null {
  if (typeof window === "undefined") return null;
  const query = window.location.hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const raw = (params.get("sessionId") ?? params.get("crm_session"))?.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : raw;
}

export function createConnectionQuery(
  connectionId: CrmWhatsappConnectionId | null,
) {
  return connectionId ? { connectionId } : {};
}

export async function loadDeepLinkedSession(
  api: Pick<CrmWhatsappApi, "listSessions">,
  sessionId: CrmWhatsappSessionId,
): Promise<CrmWhatsappSession | null> {
  const sessions = await api.listSessions({
    limit: 1,
    offset: 0,
    sessionId,
  });
  return sessions[0] ?? null;
}
