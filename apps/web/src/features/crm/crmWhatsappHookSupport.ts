export function asError(caught: unknown) {
  return caught instanceof Error ? caught : new Error(String(caught));
}

export function readInitialSessionId() {
  if (typeof window === "undefined") return null;
  const query = window.location.hash.split("?")[1] ?? "";
  const value = Number(new URLSearchParams(query).get("crm_session"));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function createConnectionQuery(connectionId: number | null) {
  return connectionId ? { connectionId } : {};
}
