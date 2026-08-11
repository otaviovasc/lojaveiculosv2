import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappMessage,
  CrmWhatsappRealtimeEvent,
  CrmWhatsappRealtimeStatus,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

type RealtimeOptions = {
  activeSessionId: CrmWhatsappSessionId | null;
  api: CrmWhatsappApi;
  canMergeSessionSnapshot?: (session: CrmWhatsappSession) => boolean;
  connectionId: string | null;
  connectionsError: Error | null;
  mergeRealtimeMessage: (message: CrmWhatsappMessage) => void;
  mergeSessions: (
    nextSessions: CrmWhatsappSession[],
    options?: { preserveLocalOnly?: boolean },
  ) => void;
  onStatus?: (status: CrmWhatsappRealtimeStatus) => void;
  refreshConnections: () => Promise<void>;
  refreshSessionCounts: () => Promise<void>;
  refreshSessions: (options?: { preserveLocalOnly?: boolean }) => Promise<void>;
  setError: (error: Error) => void;
  updateRealtimeMessageStatus: (
    input: Extract<CrmWhatsappRealtimeEvent, { type: "message_status" }>,
  ) => void;
};

export function useCrmWhatsappRealtime({
  activeSessionId,
  api,
  canMergeSessionSnapshot,
  connectionId,
  connectionsError,
  mergeRealtimeMessage,
  mergeSessions,
  onStatus,
  refreshConnections,
  refreshSessionCounts,
  refreshSessions,
  setError,
  updateRealtimeMessageStatus,
}: RealtimeOptions) {
  const [status, setStatus] = useState<CrmWhatsappRealtimeStatus>("offline");
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
        if (
          canMergeSessionSnapshot &&
          !canMergeSessionSnapshot(event.session)
        ) {
          return;
        }
        mergeSessions([event.session], { preserveLocalOnly: true });
        void refreshSessionCounts().catch(() => undefined);
        return;
      }
      if (event.type === "message") {
        if (
          canMergeSessionSnapshot &&
          !canMergeSessionSnapshot(event.session)
        ) {
          return;
        }
        mergeSessions([event.session], { preserveLocalOnly: true });
        void refreshSessionCounts().catch(() => undefined);
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
      canMergeSessionSnapshot,
      connectionId,
      mergeRealtimeMessage,
      mergeSessions,
      refreshConnections,
      refreshSessionCounts,
      refreshSessions,
      updateRealtimeMessageStatus,
    ],
  );

  useEffect(() => {
    if (connectionsError || !connectionId) {
      setStatus("offline");
      onStatus?.("offline");
      return;
    }
    setStatus("connecting");
    onStatus?.("connecting");
    return api.subscribeEvents({
      connectionId,
      onError: (caught) => {
        setStatus("degraded");
        onStatus?.("degraded");
        setError(asError(caught));
      },
      onEvent: handleRealtimeEvent,
      onStatus: (nextStatus) => {
        setStatus(nextStatus);
        onStatus?.(nextStatus);
      },
    });
  }, [
    api,
    connectionsError,
    connectionId,
    handleRealtimeEvent,
    onStatus,
    setError,
  ]);

  return { status };
}
