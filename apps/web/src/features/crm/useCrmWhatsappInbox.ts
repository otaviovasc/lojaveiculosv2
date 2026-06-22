import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import {
  createOptimisticTextMessage,
  hasConnectedWhatsapp,
  mergeMessagesFromServer,
  mergeSessionsFromServer,
  normalizeBootstrap,
  type WhatsappMessageView,
} from "./crmWhatsappModel";
import { asError, readInitialSessionId } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappAgent,
  CrmWhatsappConnection,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

const SESSION_PAGE_SIZE = 40;
const MESSAGE_PAGE_SIZE = 50;

export function useCrmWhatsappInbox(api: CrmWhatsappApi) {
  const initialSessionId = readInitialSessionId();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(
    initialSessionId,
  );
  const [agents, setAgents] = useState<CrmWhatsappAgent[]>([]);
  const [connections, setConnections] = useState<CrmWhatsappConnection[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [isLoadingBootstrap, setIsLoadingBootstrap] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<WhatsappMessageView[]>([]);
  const [search, setSearch] = useState("");
  const [sessions, setSessions] = useState<CrmWhatsappSession[]>([]);
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const activeSessionIdRef = useRef(activeSessionId);
  const searchRef = useRef(search);
  activeSessionIdRef.current = activeSessionId;
  searchRef.current = search;

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

  const refreshSessions = useCallback(
    async (options: { preserveLocalOnly?: boolean } = {}) => {
      const nextSessions = await api.listSessions({
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
          limit: 1,
          offset: 0,
          sessionId: initialSessionId,
        });
        resolved = deepLinked[0] ? [deepLinked[0], ...nextSessions] : nextSessions;
      }
      mergeSessions(resolved, options);
      if (!activeSessionIdRef.current) setActiveSessionId(resolved[0]?.id ?? null);
    },
    [api, initialSessionId, mergeSessions],
  );

  useEffect(() => {
    let active = true;
    setIsLoadingBootstrap(true);
    setError(null);
    void api
      .bootstrap()
      .then((payload) => {
        if (!active) return;
        const bootstrap = normalizeBootstrap(payload);
        setAgents(bootstrap.agents);
        setConnections(bootstrap.connections);
        setHasConnection(hasConnectedWhatsapp(bootstrap.connections));
      })
      .catch((caught) => {
        if (active) setError(asError(caught));
      })
      .finally(() => {
        if (active) setIsLoadingBootstrap(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  useEffect(() => {
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
  }, [refreshSessions, search]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshSessions({ preserveLocalOnly: true }).catch(() => undefined);
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshSessions({ preserveLocalOnly: true }).catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshSessions]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    let active = true;
    setIsLoadingMessages(true);
    const loadMessages = async () => {
      const nextMessages = await api.listMessages(activeSessionId, {
        limit: MESSAGE_PAGE_SIZE,
        offset: 0,
      });
      if (active) {
        setMessages((current) => mergeMessagesFromServer(current, nextMessages));
      }
    };
    void loadMessages()
      .catch((caught) => {
        if (active) setError(asError(caught));
      })
      .finally(() => {
        if (active) setIsLoadingMessages(false);
      });
    const interval = window.setInterval(() => {
      void loadMessages().catch(() => undefined);
    }, 5_000);
    void api.markSessionAsRead(activeSessionId).then(() => {
      setSessions((current) =>
        current.map((session) =>
          session.id === activeSessionId
            ? { ...session, lastReadAt: new Date().toISOString(), unreadCount: 0 }
            : session,
        ),
      );
    });
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeSessionId, api]);

  const sendText = async (text: string) => {
    if (!activeSessionId || !text.trim()) return false;
    const optimistic = createOptimisticTextMessage(text.trim());
    setMessages((current) => [...current, optimistic]);
    setIsSending(true);
    try {
      const sent = await api.sendText({ sessionId: activeSessionId, text: text.trim() });
      setMessages((current) =>
        current.map((message) =>
          message.clientId === optimistic.clientId ? sent : message,
        ),
      );
      if (activeSession) {
        mergeSessions([
          {
            ...activeSession,
            lastMessageAt: sent.createdAt,
            lastMessageContent: `Eu: ${sent.content}`,
            status: "HUMAN_TAKEOVER",
          },
        ]);
      }
      return true;
    } catch (caught) {
      setMessages((current) =>
        current.filter((message) => message.clientId !== optimistic.clientId),
      );
      setError(asError(caught));
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    activeSession,
    activeSessionId,
    agents,
    connections,
    error,
    hasConnection,
    isLoading: isLoadingBootstrap || isLoadingSessions,
    isLoadingMessages,
    isSending,
    messages,
    refreshSessions,
    search,
    sendText,
    sessions,
    setActiveSessionId,
    setSearch,
    actions: {
      assignSession: api.assignSession,
      closeSession: api.closeSession,
      markSessionAsUnread: api.markSessionAsUnread,
      toggleIntervention: api.toggleIntervention,
    },
  };
}
