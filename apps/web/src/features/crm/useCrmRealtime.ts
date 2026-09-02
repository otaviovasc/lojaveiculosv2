import { useCallback, useEffect, useRef, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import type {
  CrmMessage,
  CrmContactPresence,
  CrmRealtimeEvent,
  CrmRealtimeStatus,
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";

type RealtimeOptions = {
  activeConversationConnectionId?: string | null;
  activeCycleId: CrmConversationCycleId | null;
  activeCustomerPhone?: string | null;
  api: CrmConversationApi;
  canAccessSessionSnapshot?: (cycle: CrmConversationCycle) => boolean;
  canMergeSessionSnapshot?: (cycle: CrmConversationCycle) => boolean;
  /**
   * Connection to subscribe to. `undefined` subscribes store-wide (the server
   * still scopes delivery to the subscriber's visible connections); `null`
   * keeps the hook offline.
   */
  connectionId: string | null | undefined;
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
  activeConversationConnectionId,
  activeCycleId,
  activeCustomerPhone,
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
  const [contactPresence, setContactPresence] =
    useState<CrmContactPresence | null>(null);
  const presenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearContactPresence = useCallback(() => {
    if (presenceTimerRef.current) {
      globalThis.clearTimeout(presenceTimerRef.current);
      presenceTimerRef.current = null;
    }
    setContactPresence(null);
  }, []);
  const publishContactPresence = useCallback(
    (presence: CrmContactPresence, ttlMs: number) => {
      clearContactPresence();
      setContactPresence(presence);
      presenceTimerRef.current = globalThis.setTimeout(() => {
        presenceTimerRef.current = null;
        setContactPresence(null);
      }, ttlMs);
    },
    [clearContactPresence],
  );
  const hasConnectionsError = connectionsError !== null;
  const latestHandlersRef = useRef({
    activeConversationConnectionId,
    activeCycleId,
    activeCustomerPhone,
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
    activeConversationConnectionId,
    activeCycleId,
    activeCustomerPhone,
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
    clearContactPresence();
  }, [
    activeConversationConnectionId,
    activeCycleId,
    activeCustomerPhone,
    clearContactPresence,
    connectionId,
  ]);

  useEffect(() => {
    const publishStatus = (nextStatus: CrmRealtimeStatus) => {
      setStatus(nextStatus);
      latestHandlersRef.current.onStatus?.(nextStatus);
    };
    if (hasConnectionsError || connectionId === null) {
      clearContactPresence();
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
          if (event.message.direction === "INBOUND") {
            clearContactPresence();
          }
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
        return;
      }
      if (event.type === "presence") {
        if (
          !latest.activeCycleId ||
          !latest.activeConversationConnectionId ||
          String(event.cycleId) !== String(latest.activeCycleId) ||
          String(event.connectionId) !==
            String(latest.activeConversationConnectionId)
        ) {
          return;
        }
        const presence = readCorrelatedContactPresence(event.payload);
        if (presence === "typing") {
          publishContactPresence("typing", 6_000);
        } else if (presence === "online") {
          publishContactPresence("online", 30_000);
        } else if (presence === "clear") {
          clearContactPresence();
        }
      }
    };
    const unsubscribe = api.subscribeEvents({
      ...(connectionId !== undefined ? { connectionId } : {}),
      onError: (caught) => {
        void caught;
        if (!active) return;
        clearContactPresence();
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
        clearContactPresence();
        publishStatus("connecting");
        scheduleDegradedStatus();
      },
    });
    return () => {
      active = false;
      clearDegradedTimer();
      clearContactPresence();
      unsubscribe();
    };
  }, [
    api,
    clearContactPresence,
    connectionId,
    hasConnectionsError,
    publishContactPresence,
  ]);

  return { contactPresence, status };
}

function readCorrelatedContactPresence(
  payload: Record<string, unknown>,
): CrmContactPresence | "clear" | null {
  if (typeof payload.state !== "string") return null;
  switch (payload.state) {
    case "composing":
      return "typing";
    case "available":
      return "online";
    case "paused":
    case "unavailable":
      return "clear";
    default:
      return null;
  }
}
