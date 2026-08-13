import { type SetStateAction, useEffect } from "react";
import type {
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

type UseCrmWhatsappInboxLifecycleInput = {
  activeSession: CrmWhatsappSession | null;
  asError: (error: unknown) => Error;
  connectionId: string | null;
  connections: {
    error: Error | null;
    isLoading: boolean;
    refreshConnections: () => Promise<unknown>;
  };
  markSessionReadOnce: (session: CrmWhatsappSession) => void;
  hasLoadedActiveMessages: boolean;
  manualUnreadSessionIdsRef: { current: Set<CrmWhatsappSessionId> };
  permissions: {
    canList: boolean;
    canRead: boolean;
  };
  refreshSessions: (options?: {
    preserveLocalOnly?: boolean;
  }) => Promise<unknown>;
  search: string | null;
  setSessions: (value: SetStateAction<CrmWhatsappSession[]>) => void;
  setError: (error: Error | null) => void;
  setIsLoadingSessions: (value: SetStateAction<boolean>) => void;
};

export function useCrmWhatsappInboxLifecycle({
  activeSession,
  asError,
  connectionId,
  connections,
  markSessionReadOnce,
  hasLoadedActiveMessages,
  manualUnreadSessionIdsRef,
  permissions,
  refreshSessions,
  search,
  setSessions,
  setError,
  setIsLoadingSessions,
}: UseCrmWhatsappInboxLifecycleInput): void {
  useEffect(() => {
    if (
      !activeSession ||
      !hasLoadedActiveMessages ||
      document.visibilityState !== "visible" ||
      manualUnreadSessionIdsRef.current.has(activeSession.id)
    ) {
      return;
    }
    markSessionReadOnce(activeSession);
  }, [
    activeSession,
    hasLoadedActiveMessages,
    manualUnreadSessionIdsRef,
    markSessionReadOnce,
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
          !manualUnreadSessionIdsRef.current.has(activeSession.id)
        ) {
          markSessionReadOnce(activeSession);
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
    manualUnreadSessionIdsRef,
    markSessionReadOnce,
    permissions.canList,
    refreshSessions,
  ]);
}
