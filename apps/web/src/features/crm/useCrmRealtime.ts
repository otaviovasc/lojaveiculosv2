import { useEffect, useRef, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import type {
  CrmMessage,
  CrmRealtimeEvent,
  CrmRealtimeStatus,
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";

type RealtimeOptions = {
  activeCycleId: CrmConversationCycleId | null;
  api: CrmConversationApi;
  canAccessSessionSnapshot?: (cycle: CrmConversationCycle) => boolean;
  canMergeSessionSnapshot?: (cycle: CrmConversationCycle) => boolean;
  connectionId: string | null;
  connectionsError: Error | null;
  mergeRealtimeMessage: (message: CrmMessage) => void;
  mergeCycles: (
    nextSessions: CrmConversationCycle[],
    options?: {
      preserveLocalOnly?: boolean;
      snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
    },
  ) => void;
  onStatus?: (status: CrmRealtimeStatus) => void;
  onVisibleInboundMessage?: (cycle: CrmConversationCycle) => void;
  reconcileSessions?: () => Promise<unknown>;
  refreshConnections: () => Promise<void>;
  refreshSessionCounts: () => Promise<void>;
  removeSession: (cycleId: CrmConversationCycleId) => void;
  updateRealtimeMessageStatus: (
    input: Extract<CrmRealtimeEvent, { type: "message_status" }>,
  ) => void;
};

export function useCrmRealtime({
  activeCycleId,
  api,
  canAccessSessionSnapshot,
  canMergeSessionSnapshot,
  connectionId,
  connectionsError,
  mergeRealtimeMessage,
  mergeCycles,
  onStatus,
  onVisibleInboundMessage,
  reconcileSessions,
  refreshConnections,
  refreshSessionCounts,
  removeSession,
  updateRealtimeMessageStatus,
}: RealtimeOptions) {
  const [status, setStatus] = useState<CrmRealtimeStatus>("offline");
  const hasConnectionsError = connectionsError !== null;
  const latestHandlersRef = useRef({
    activeCycleId,
    canAccessSessionSnapshot,
    canMergeSessionSnapshot,
    mergeRealtimeMessage,
    mergeCycles,
    onStatus,
    onVisibleInboundMessage,
    reconcileSessions,
    refreshConnections,
    refreshSessionCounts,
    removeSession,
    updateRealtimeMessageStatus,
  });
  latestHandlersRef.current = {
    activeCycleId,
    canAccessSessionSnapshot,
    canMergeSessionSnapshot,
    mergeRealtimeMessage,
    mergeCycles,
    onStatus,
    onVisibleInboundMessage,
    reconcileSessions,
    refreshConnections,
    refreshSessionCounts,
    removeSession,
    updateRealtimeMessageStatus,
  };

  useEffect(() => {
    const publishStatus = (nextStatus: CrmRealtimeStatus) => {
      setStatus(nextStatus);
      latestHandlersRef.current.onStatus?.(nextStatus);
    };
    if (hasConnectionsError || !connectionId) {
      publishStatus("offline");
      return;
    }
    publishStatus("connecting");
    let active = true;
    let hasConnected = false;
    let degradedTimer: ReturnType<typeof setTimeout> | null = null;
    const clearDegradedTimer = () => {
      if (degradedTimer) globalThis.clearTimeout(degradedTimer);
      degradedTimer = null;
    };
    const scheduleDegradedStatus = () => {
      if (degradedTimer) return;
      degradedTimer = globalThis.setTimeout(() => {
        degradedTimer = null;
        if (active) publishStatus("degraded");
      }, 10_000);
    };
    const handleRealtimeEvent = (event: CrmRealtimeEvent) => {
      if (!active) return;
      const latest = latestHandlersRef.current;
      if (event.type === "connected") return;
      if (
        "connectionId" in event &&
        connectionId &&
        String(event.connectionId) !== String(connectionId)
      )
        return;
      if (event.type === "cycle") {
        if (
          latest.canMergeSessionSnapshot &&
          !latest.canMergeSessionSnapshot(event.cycle)
        ) {
          return;
        }
        if (
          latest.canAccessSessionSnapshot &&
          !latest.canAccessSessionSnapshot(event.cycle)
        ) {
          latest.removeSession(event.cycle.id);
          void latest.refreshSessionCounts().catch(() => undefined);
          return;
        }
        latest.mergeCycles([event.cycle], {
          preserveLocalOnly: true,
          snapshotKind: "realtime",
        });
        void latest.refreshSessionCounts().catch(() => undefined);
        return;
      }
      if (event.type === "message") {
        if (
          latest.canMergeSessionSnapshot &&
          !latest.canMergeSessionSnapshot(event.cycle)
        ) {
          return;
        }
        if (
          latest.canAccessSessionSnapshot &&
          !latest.canAccessSessionSnapshot(event.cycle)
        ) {
          latest.removeSession(event.cycle.id);
          void latest.refreshSessionCounts().catch(() => undefined);
          return;
        }
        latest.mergeCycles([event.cycle], {
          preserveLocalOnly: true,
          snapshotKind: "realtime",
        });
        void latest.refreshSessionCounts().catch(() => undefined);
        if (String(event.cycle.id) === String(latest.activeCycleId)) {
          latest.mergeRealtimeMessage(event.message);
          if (
            event.message.direction === "INBOUND" &&
            document.visibilityState === "visible"
          ) {
            latest.onVisibleInboundMessage?.(event.cycle);
          }
        }
        return;
      }
      if (event.type === "message_status") {
        if (String(event.cycleId) === String(latest.activeCycleId)) {
          latest.updateRealtimeMessageStatus(event);
        }
        return;
      }
      if (event.type === "connection_status") {
        void latest.refreshConnections().catch(() => undefined);
      }
    };
    const unsubscribe = api.subscribeEvents({
      connectionId,
      onError: (caught) => {
        void caught;
        if (!active) return;
        publishStatus("connecting");
        scheduleDegradedStatus();
      },
      onEvent: handleRealtimeEvent,
      onStatus: (nextStatus) => {
        if (!active) return;
        if (nextStatus === "connected") {
          clearDegradedTimer();
          publishStatus("connected");
          if (hasConnected) {
            void latestHandlersRef.current
              .reconcileSessions?.()
              .catch(() => undefined);
          }
          hasConnected = true;
          return;
        }
        publishStatus("connecting");
        scheduleDegradedStatus();
      },
    });
    return () => {
      active = false;
      clearDegradedTimer();
      unsubscribe();
    };
  }, [api, connectionId, hasConnectionsError]);

  return { status };
}
