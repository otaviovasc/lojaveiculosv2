import {
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError, createConnectionQuery } from "./crmWhatsappHookSupport";
import {
  createOptimisticTextMessage,
  mergeMessagesFromServer,
  type WhatsappMessageView,
} from "./crmWhatsappModel";
import type { CrmWhatsappScope, CrmWhatsappSession } from "./crmWhatsappTypes";

const MESSAGE_PAGE_SIZE = 50;

type UseCrmWhatsappMessagesOptions = {
  activeSession: CrmWhatsappSession | null;
  activeSessionId: number | null;
  api: CrmWhatsappApi;
  canLoadMessages: boolean;
  mergeSessions: (nextSessions: CrmWhatsappSession[]) => void;
  scopeRef: MutableRefObject<CrmWhatsappScope>;
  setError: (error: Error) => void;
  setSessions: Dispatch<SetStateAction<CrmWhatsappSession[]>>;
};

export function useCrmWhatsappMessages({
  activeSession,
  activeSessionId,
  api,
  canLoadMessages,
  mergeSessions,
  scopeRef,
  setError,
  setSessions,
}: UseCrmWhatsappMessagesOptions) {
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<WhatsappMessageView[]>([]);

  useEffect(() => {
    if (!activeSessionId || !canLoadMessages) {
      setMessages([]);
      return;
    }
    let active = true;
    setIsLoadingMessages(true);
    const loadMessages = async () => {
      const nextMessages = await api.listMessages(activeSessionId, {
        ...createConnectionQuery(scopeRef.current.connectionId),
        limit: MESSAGE_PAGE_SIZE,
        offset: 0,
      });
      if (active) {
        setMessages((current) =>
          mergeMessagesFromServer(current, nextMessages),
        );
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
    void api
      .markSessionAsRead(activeSessionId, scopeRef.current.connectionId)
      .then(() => {
        setSessions((current) =>
          current.map((session) =>
            session.id === activeSessionId
              ? {
                  ...session,
                  lastReadAt: new Date().toISOString(),
                  unreadCount: 0,
                }
              : session,
          ),
        );
      });
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeSessionId, api, canLoadMessages, scopeRef, setError, setSessions]);

  const sendText = async (text: string) => {
    if (!activeSessionId || !canLoadMessages || !text.trim()) return false;
    const optimistic = createOptimisticTextMessage(text.trim());
    setMessages((current) => [...current, optimistic]);
    setIsSending(true);
    try {
      const sent = await api.sendText({
        ...createConnectionQuery(scopeRef.current.connectionId),
        sessionId: activeSessionId,
        text: text.trim(),
      });
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

  return { isLoadingMessages, isSending, messages, sendText };
}
