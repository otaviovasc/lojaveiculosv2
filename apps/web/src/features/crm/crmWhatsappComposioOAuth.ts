export const composioPendingConnectionKey =
  "crm.whatsapp.composio.pendingConnectionId";

export function readPendingComposioConnectionId() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(composioPendingConnectionKey);
}

export function rememberPendingComposioConnection(connectionId: string) {
  window.sessionStorage.setItem(composioPendingConnectionKey, connectionId);
}

export function clearPendingComposioConnection() {
  window.sessionStorage.removeItem(composioPendingConnectionKey);
}
