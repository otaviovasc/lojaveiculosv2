import { useEffect, useRef, useState } from "react";
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
  canAccessSessionSnapshot?: (session: CrmWhatsappSession) => boolean;
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
  removeSession: (sessionId: CrmWhatsappSessionId) => void;
  updateRealtimeMessageStatus: (
    input: Extract<CrmWhatsappRealtimeEvent, { type: "message_status" }>,
  ) => void;
};

export function useCrmWhatsappRealtime({
  activeSessionId,
  api,
  canAccessSessionSnapshot,
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
  removeSession,
  updateRealtimeMessageStatus,
}: RealtimeOptions) {
  const [status, setStatus] = useState<CrmWhatsappRealtimeStatus>("offline");
  const hasConnectionsError = connectionsError !== null;
  const latestHandlersRef = useRef({
    activeSessionId,
    canAccessSessionSnapshot,
    canMergeSessionSnapshot,
    mergeRealtimeMessage,
    mergeSessions,
    onStatus,
    onVisibleInboundMessage,
    refreshConnections,
    refreshSessionCounts,
    refreshSessions,
    removeSession,
    updateRealtimeMessageStatus,
  });
  latestHandlersRef.current = {
    activeSessionId,
    canAccessSessionSnapshot,
    canMergeSessionSnapshot,
    mergeRealtimeMessage,
    mergeSessions,
    onStatus,
    onVisibleInboundMessage,
    refreshConnections,
    refreshSessionCounts,
    refreshSessions,
    removeSession,
    updateRealtimeMessageStatus,
  };

  useEffect(() => {
    const publishStatus = (nextStatus: CrmWhatsappRealtimeStatus) => {
      setStatus(nextStatus);
      latestHandlersRef.current.onStatus?.(nextStatus);
    };
    if (hasConnectionsError || !connectionId) {
      publishStatus("offline");
      return;
    }
    publishStatus("connecting");
    let active = true;
    let reconciliationGeneration = 0;
    const handleRealtimeEvent = (event: CrmWhatsappRealtimeEvent) => {
      if (!active) return;
      const latest = latestHandlersRef.current;
      if (event.type === "connected") return;
      if (
        "connectionId" in event &&
        connectionId &&
        String(event.connectionId) !== String(connectionId)
      )
        return;
      if (event.type === "session") {
        if (
          latest.canMergeSessionSnapshot &&
          !latest.canMergeSessionSnapshot(event.session)
        ) {
          return;
        }
        if (
          latest.canAccessSessionSnapshot &&
          !latest.canAccessSessionSnapshot(event.session)
        ) {
          latest.removeSession(event.session.id);
          void latest.refreshSessionCounts().catch(() => undefined);
          return;
        }
        latest.mergeSessions([event.session], {
          preserveLocalOnly: true,
          snapshotKind: "realtime",
        });
        void latest.refreshSessionCounts().catch(() => undefined);
        return;
      }
      if (event.type === "message") {
        if (
          latest.canMergeSessionSnapshot &&
          !latest.canMergeSessionSnapshot(event.session)
        ) {
          return;
        }
        if (
          latest.canAccessSessionSnapshot &&
          !latest.canAccessSessionSnapshot(event.session)
        ) {
          latest.removeSession(event.session.id);
          void latest.refreshSessionCounts().catch(() => undefined);
          return;
        }
        latest.mergeSessions([event.session], {
          preserveLocalOnly: true,
          snapshotKind: "realtime",
        });
        void latest.refreshSessionCounts().catch(() => undefined);
        if (String(event.session.id) === String(latest.activeSessionId)) {
          latest.mergeRealtimeMessage(event.message);
          if (
            event.message.direction === "INBOUND" &&
            document.visibilityState === "visible"
          ) {
            latest.onVisibleInboundMessage?.(event.session);
          }
        }
        return;
      }
      if (event.type === "message_status") {
        if (String(event.sessionId) === String(latest.activeSessionId)) {
          latest.updateRealtimeMessageStatus(event);
        }
        void latest
          .refreshSessions({ preserveLocalOnly: true })
          .catch(() => undefined);
        return;
      }
      if (event.type === "connection_status") {
        void latest.refreshConnections().catch(() => undefined);
      }
    };
    const reconcileBeforeConnected = async (generation: number) => {
      publishStatus("connecting");
      const latest = latestHandlersRef.current;
      await Promise.all([
        latest.refreshConnections(),
        latest.refreshSessions({
          preserveLocalOnly: true,
          snapshotKind: "reconciled",
        }),
        latest.refreshSessionCounts(),
      ]);
      if (!active || generation !== reconciliationGeneration) return;
      publishStatus("connected");
    };
    const unsubscribe = api.subscribeEvents({
      connectionId,
      onError: (caught) => {
        void caught;
        if (!active) return;
        reconciliationGeneration += 1;
        publishStatus("degraded");
      },
      onEvent: handleRealtimeEvent,
      onStatus: (nextStatus) => {
        if (!active) return;
        const generation = ++reconciliationGeneration;
        if (nextStatus === "connected") {
          void reconcileBeforeConnected(generation).catch(() => {
            if (!active || generation !== reconciliationGeneration) return;
            publishStatus("degraded");
          });
          return;
        }
        publishStatus(nextStatus);
      },
    });
    return () => {
      active = false;
      reconciliationGeneration += 1;
      unsubscribe();
    };
  }, [api, connectionId, hasConnectionsError]);

  return { status };
}
