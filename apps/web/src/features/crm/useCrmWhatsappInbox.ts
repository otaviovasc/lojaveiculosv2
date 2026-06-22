import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { mergeSessionsFromServer } from "./crmWhatsappModel";
import {
  asError,
  createConnectionQuery,
  readInitialSessionId,
} from "./crmWhatsappHookSupport";
import { useCrmWhatsappBootstrap } from "./useCrmWhatsappBootstrap";
import { useCrmWhatsappMessages } from "./useCrmWhatsappMessages";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

const SESSION_PAGE_SIZE = 40;

export function useCrmWhatsappInbox(api: CrmWhatsappApi) {
  const initialSessionId = readInitialSessionId();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(
    initialSessionId,
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<CrmWhatsappSession[]>([]);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const bootstrap = useCrmWhatsappBootstrap(api);
  const searchRef = useRef(search);
  const scopeRef = useRef(bootstrap.scope);
  searchRef.current = search;
  scopeRef.current = bootstrap.scope;

  const mergeSessions = useCallback(
    (
      nextSessions: CrmWhatsappSession[],
      options?: { preserveLocalOnly?: boolean },
    ) => {
      setSessions((current) =>
        mergeSessionsFromServer(current, nextSessions, options),
      );
    },
    [],
  );
  const canLoadMessages =
    bootstrap.isReady && !bootstrap.error && bootstrap.hasConnection !== false;
  const messageState = useCrmWhatsappMessages({
    activeSession,
    activeSessionId,
    api,
    canLoadMessages,
    mergeSessions,
    scopeRef,
    setError,
    setSessions,
  });

  const refreshSessions = useCallback(
    async (options: { preserveLocalOnly?: boolean } = {}) => {
      const nextSessions = await api.listSessions({
        ...createConnectionQuery(scopeRef.current.connectionId),
        limit: SESSION_PAGE_SIZE,
        offset: 0,
        ...(searchRef.current ? { search: searchRef.current } : {}),
      });
      let resolved = nextSessions;
      if (
        initialSessionId &&
        !nextSessions.some((session) => session.id === initialSessionId)
      ) {
        const deepLinked = await api.listSessions({
          ...createConnectionQuery(scopeRef.current.connectionId),
          limit: 1,
          offset: 0,
          sessionId: initialSessionId,
        });
        resolved = deepLinked[0]
          ? [deepLinked[0], ...nextSessions]
          : nextSessions;
      }
      mergeSessions(resolved, options);
      setActiveSessionId((current) => current ?? resolved[0]?.id ?? null);
    },
    [api, initialSessionId, mergeSessions],
  );

  useEffect(() => {
    if (!bootstrap.isReady) return;
    if (bootstrap.error || bootstrap.hasConnection === false) {
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
    bootstrap.error,
    bootstrap.hasConnection,
    bootstrap.isReady,
    refreshSessions,
    search,
  ]);

  useEffect(() => {
    if (
      !bootstrap.isReady ||
      bootstrap.error ||
      bootstrap.hasConnection === false
    ) {
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
  }, [
    bootstrap.error,
    bootstrap.hasConnection,
    bootstrap.isReady,
    refreshSessions,
  ]);

  return {
    activeSession,
    activeSessionId,
    agents: bootstrap.agents,
    canAssignSessions: bootstrap.scope.canAssignSessions,
    connectionId: bootstrap.scope.connectionId,
    error: error ?? bootstrap.error,
    hasConnection: bootstrap.hasConnection,
    isLoading: bootstrap.isLoading || isLoadingSessions,
    isLoadingMessages: messageState.isLoadingMessages,
    isSending: messageState.isSending,
    messages: messageState.messages,
    refreshSessions,
    search,
    sendText: messageState.sendText,
    sessions,
    setActiveSessionId,
    setSearch,
    actions: {
      assignSession: api.assignSession,
      closeSession: api.closeSession,
      toggleIntervention: api.toggleIntervention,
    },
  };
}
