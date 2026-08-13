import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
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
    options?: {
      preserveLocalOnly?: boolean;
      snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
    },
  ) => void;
  onStatus?: (status: CrmWhatsappRealtimeStatus) => void;
  onVisibleInboundMessage?: (session: CrmWhatsappSession) => void;
  refreshConnections: () => Promise<void>;
  refreshSessionCounts: () => Promise<void>;
  refreshSessions: (options?: {
    preserveLocalOnly?: boolean;
    snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
  }) => Promise<void>;
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
  onVisibleInboundMessage,
  refreshConnections,
  refreshSessionCounts,
  refreshSessions,
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
        mergeSessions([event.session], {
          preserveLocalOnly: true,
          snapshotKind: "realtime",
        });
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
        mergeSessions([event.session], {
          preserveLocalOnly: true,
          snapshotKind: "realtime",
        });
        void refreshSessionCounts().catch(() => undefined);
        if (String(event.session.id) === String(activeSessionId)) {
          mergeRealtimeMessage(event.message);
          if (
            event.message.direction === "INBOUND" &&
            document.visibilityState === "visible"
          ) {
            onVisibleInboundMessage?.(event.session);
          }
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
      onVisibleInboundMessage,
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
    let active = true;
    const reconcileBeforeConnected = async () => {
      setStatus("connecting");
      onStatus?.("connecting");
      await Promise.all([
        refreshConnections(),
        refreshSessions({
          preserveLocalOnly: true,
          snapshotKind: "reconciled",
        }),
        refreshSessionCounts(),
      ]);
      if (!active) return;
      setStatus("connected");
      onStatus?.("connected");
    };
    const unsubscribe = api.subscribeEvents({
      connectionId,
      onError: (caught) => {
        void caught;
        setStatus("degraded");
        onStatus?.("degraded");
      },
      onEvent: handleRealtimeEvent,
      onStatus: (nextStatus) => {
        if (nextStatus === "connected") {
          void reconcileBeforeConnected().catch(() => {
            if (!active) return;
            setStatus("degraded");
            onStatus?.("degraded");
          });
          return;
        }
        setStatus(nextStatus);
        onStatus?.(nextStatus);
      },
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    api,
    connectionsError,
    connectionId,
    handleRealtimeEvent,
    onStatus,
    refreshConnections,
    refreshSessionCounts,
    refreshSessions,
  ]);

  return { status };
}
