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
  refreshConnections: () => Promise<void>;
  refreshSessionCounts: () => Promise<void>;
  refreshSessions: (options?: {
    preserveLocalOnly?: boolean;
    snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
  }) => Promise<void>;
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
  refreshConnections,
  refreshSessionCounts,
  refreshSessions,
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
    refreshConnections,
    refreshSessionCounts,
    refreshSessions,
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
    refreshConnections,
    refreshSessionCounts,
    refreshSessions,
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
    let reconciliationGeneration = 0;
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
