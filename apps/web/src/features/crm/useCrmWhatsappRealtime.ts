import { useCallback, useEffect } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappMessage,
  CrmWhatsappRealtimeEvent,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

type RealtimeOptions = {
  activeSessionId: CrmWhatsappSessionId | null;
  api: CrmWhatsappApi;
  connectionId: string | null;
  connectionsError: Error | null;
  mergeRealtimeMessage: (message: CrmWhatsappMessage) => void;
  mergeSessions: (
    nextSessions: CrmWhatsappSession[],
    options?: { preserveLocalOnly?: boolean },
  ) => void;
  refreshConnections: () => Promise<void>;
  refreshSessions: (options?: { preserveLocalOnly?: boolean }) => Promise<void>;
  setError: (error: Error) => void;
  updateRealtimeMessageStatus: (
    input: Extract<CrmWhatsappRealtimeEvent, { type: "message_status" }>,
  ) => void;
};

export function useCrmWhatsappRealtime({
  activeSessionId,
  api,
  connectionId,
  connectionsError,
  mergeRealtimeMessage,
  mergeSessions,
  refreshConnections,
  refreshSessions,
  setError,
  updateRealtimeMessageStatus,
}: RealtimeOptions) {
  const handleRealtimeEvent = useCallback(
    (event: CrmWhatsappRealtimeEvent) => {
      if (event.type === "connected") return;
      if (
        "connectionId" in event &&
        connectionId &&
        String(event.connectionId) !== String(connectionId)
      )
        return;
      if (event.type === "session") {
        mergeSessions([event.session], { preserveLocalOnly: true });
        return;
      }
      if (event.type === "message") {
        mergeSessions([event.session], { preserveLocalOnly: true });
        if (String(event.session.id) === String(activeSessionId)) {
          mergeRealtimeMessage(event.message);
        }
        return;
      }
      if (event.type === "message_status") {
        if (String(event.sessionId) === String(activeSessionId)) {
          updateRealtimeMessageStatus(event);
        }
        void refreshSessions({ preserveLocalOnly: true }).catch(
          () => undefined,
        );
        return;
      }
      if (event.type === "connection_status") {
        void refreshConnections().catch(() => undefined);
      }
    },
    [
      activeSessionId,
      connectionId,
      mergeRealtimeMessage,
      mergeSessions,
      refreshConnections,
      refreshSessions,
      updateRealtimeMessageStatus,
    ],
  );

  useEffect(() => {
    if (connectionsError || !connectionId) return;
    return api.subscribeEvents({
      connectionId,
      onError: (caught) => setError(asError(caught)),
      onEvent: handleRealtimeEvent,
    });
  }, [api, connectionsError, connectionId, handleRealtimeEvent, setError]);
}
