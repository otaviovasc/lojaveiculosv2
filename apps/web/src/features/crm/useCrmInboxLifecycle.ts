import { type SetStateAction, useEffect } from "react";
import type {
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";

type UseCrmInboxLifecycleInput = {
  activeSession: CrmConversationCycle | null;
  asError: (error: unknown) => Error;
  connectionId: string | null;
  connections: {
    error: Error | null;
    isLoading: boolean;
    refreshConnections: () => Promise<unknown>;
  };
  markCycleReadOnce: (cycle: CrmConversationCycle) => void;
  hasLoadedActiveMessages: boolean;
  manualUnreadCycleIdsRef: { current: Set<CrmConversationCycleId> };
  permissions: {
    canList: boolean;
    canRead: boolean;
  };
  refreshSessions: (options?: {
    preserveLocalOnly?: boolean;
  }) => Promise<unknown>;
  search: string | null;
  setSessions: (value: SetStateAction<CrmConversationCycle[]>) => void;
  setError: (error: Error | null) => void;
  setIsLoadingSessions: (value: SetStateAction<boolean>) => void;
};

export function useCrmInboxLifecycle({
  activeSession,
  asError,
  connectionId,
  connections,
  markCycleReadOnce,
  hasLoadedActiveMessages,
  manualUnreadCycleIdsRef,
  permissions,
  refreshSessions,
  search,
  setSessions,
  setError,
  setIsLoadingSessions,
}: UseCrmInboxLifecycleInput): void {
  useEffect(() => {
    if (
      !activeSession ||
      !hasLoadedActiveMessages ||
      document.visibilityState !== "visible" ||
      manualUnreadCycleIdsRef.current.has(activeSession.id)
    ) {
      return;
    }
    markCycleReadOnce(activeSession);
  }, [
    activeSession,
    hasLoadedActiveMessages,
    manualUnreadCycleIdsRef,
    markCycleReadOnce,
  ]);

  useEffect(() => {
    if (search === null) return;
    if (connections.isLoading) return;
    if (connections.error || !connectionId || !permissions.canList) {
      setSessions([]);
      setIsLoadingSessions(false);
      return;
    }
    let active = true;
    setIsLoadingSessions(true);
    void refreshSessions()
      .catch((caught) => {
        if (active) setError(asError(caught));
      })
      .finally(() => {
        if (active) setIsLoadingSessions(false);
      });
    return () => {
      active = false;
    };
  }, [
    connections.error,
    connections.isLoading,
    connectionId,
    permissions.canList,
    refreshSessions,
    search,
    setError,
    setIsLoadingSessions,
    setSessions,
    asError,
  ]);

  useEffect(() => {
    if (connections.error || !connectionId || !permissions.canList) {
      return;
    }
    const interval = window.setInterval(() => {
      void refreshSessions({ preserveLocalOnly: true }).catch(() => undefined);
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (
          activeSession &&
          hasLoadedActiveMessages &&
          !manualUnreadCycleIdsRef.current.has(activeSession.id)
        ) {
          markCycleReadOnce(activeSession);
        }
        void refreshSessions({ preserveLocalOnly: true }).catch(
          () => undefined,
        );
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [
    activeSession,
    connections.error,
    connectionId,
    hasLoadedActiveMessages,
    manualUnreadCycleIdsRef,
    markCycleReadOnce,
    permissions.canList,
    refreshSessions,
  ]);
}
