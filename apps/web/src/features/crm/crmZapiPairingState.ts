import { AppApiError } from "../../lib/apiErrors";
import type { CrmProviderConnection } from "./crmConversationTypes";

export function requiresPhonePairing(error: unknown) {
  return hasPairingNextAction(
    error,
    "CRM_CONNECTION_SETUP_PAIRING_METHOD_REQUIRED",
    "request_phone_code",
  );
}

export function requiresProviderDisconnect(error: unknown) {
  return hasPairingNextAction(
    error,
    "CRM_CONNECTION_SETUP_PAIRING_DISCONNECT_REQUIRED",
    "disconnect_connection",
  );
}

export function isProviderDisconnected(connection: CrmProviderConnection) {
  return (
    connection.live?.connected === false &&
    connection.live?.smartphoneConnected !== true
  );
}

function hasPairingNextAction(error: unknown, code: string, action: string) {
  return Boolean(
    error instanceof AppApiError &&
    error.code === code &&
    error.details &&
    typeof error.details === "object" &&
    !Array.isArray(error.details) &&
    (error.details as Record<string, unknown>).nextAction === action,
  );
}
