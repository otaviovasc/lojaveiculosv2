import { type SetStateAction, useEffect } from "react";
import type {
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

type UseCrmWhatsappInboxLifecycleInput = {
  activeSession: CrmWhatsappSession | null;
  autoReadSessionIdsRef: { current: Set<CrmWhatsappSessionId> };
  asError: (error: unknown) => Error;
  connectionId: string | null;
  connections: {
    error: Error | null;
    isLoading: boolean;
    refreshConnections: () => Promise<unknown>;
  };
  markSessionReadOnce: (session: CrmWhatsappSession) => void;
  permissions: {
    canList: boolean;
    canRead: boolean;
  };
  refreshSessions: (options?: {
    preserveLocalOnly?: boolean;
  }) => Promise<unknown>;
  search: string;
  setSessions: (value: SetStateAction<CrmWhatsappSession[]>) => void;
  setError: (error: Error | null) => void;
  setIsLoadingSessions: (value: SetStateAction<boolean>) => void;
};

export function useCrmWhatsappInboxLifecycle({
  activeSession,
  autoReadSessionIdsRef,
  asError,
  connectionId,
  connections,
  markSessionReadOnce,
  permissions,
  refreshSessions,
  search,
  setSessions,
  setError,
  setIsLoadingSessions,
}: UseCrmWhatsappInboxLifecycleInput): void {
  useEffect(() => {
    if (!activeSession || autoReadSessionIdsRef.current.has(activeSession.id)) {
      return;
    }
    autoReadSessionIdsRef.current.add(activeSession.id);
    markSessionReadOnce(activeSession);
  }, [activeSession, autoReadSessionIdsRef, markSessionReadOnce]);

  useEffect(() => {
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
  }, [connections.error, connectionId, permissions.canList, refreshSessions]);
}
