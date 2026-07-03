import type {
  CrmWhatsappConnectionId,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

export function asError(caught: unknown) {
  return caught instanceof Error ? caught : new Error(String(caught));
}

export function readInitialSessionId(): CrmWhatsappSessionId | null {
  if (typeof window === "undefined") return null;
  const query = window.location.hash.split("?")[1] ?? "";
  const raw = new URLSearchParams(query).get("crm_session")?.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : raw;
}

export function createConnectionQuery(
  connectionId: CrmWhatsappConnectionId | null,
) {
  return connectionId ? { connectionId } : {};
}
