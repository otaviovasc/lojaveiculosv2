import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import { readFileAsBase64 } from "./crmWhatsappMediaFiles";
import {
  createOptimisticMediaMessage,
  createOptimisticTextMessage,
  mergeMessagesFromServer,
  type WhatsappMessageView,
} from "./crmWhatsappModel";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSendMediaType,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";
import { formatSentPreview } from "./crmWhatsappSentPreview";
import {
  applyRealtimeMessageStatus,
  type RealtimeMessageStatusUpdate,
} from "./crmWhatsappMessageStatusUpdates";
import { useCrmWhatsappStructuredMessages } from "./useCrmWhatsappStructuredMessages";

const MESSAGE_PAGE_SIZE = 50;

type SendTextOptions = {
  replyToMessage?: CrmWhatsappMessage | null;
};

type UseCrmWhatsappMessagesOptions = {
  activeSession: CrmWhatsappSession | null;
  activeSessionId: CrmWhatsappSessionId | null;
  api: CrmWhatsappApi;
  canLoadMessages: boolean;
  canSendMessages: boolean;
  mergeSessions: (nextSessions: CrmWhatsappSession[]) => void;
  setError: (error: Error) => void;
};

export function useCrmWhatsappMessages({
  activeSession,
  activeSessionId,
  api,
  canLoadMessages,
  canSendMessages,
  mergeSessions,
  setError,
}: UseCrmWhatsappMessagesOptions) {
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<WhatsappMessageView[]>([]);
  const structuredMessages = useCrmWhatsappStructuredMessages({
    activeSession,
    activeSessionId,
    api,
    canLoadMessages,
    canSendMessages,
    mergeSessions,
    setError,
    setIsSending,
    setMessages,
  });

  useEffect(() => {
    if (
      !activeSessionId ||
      !canLoadMessages ||
      typeof activeSessionId !== "string"
    ) {
      setMessages([]);
      setIsLoadingMessages(false);
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
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeSessionId, api, canLoadMessages, setError]);

  const patchMessage = useCallback((message: CrmWhatsappMessage) => {
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? message : item)),
    );
  }, []);

  const sendText = async (text: string, options: SendTextOptions = {}) => {
    if (
      !activeSessionId ||
      !activeSession ||
      !canLoadMessages ||
      !canSendMessages
    )
      return false;
    if (typeof activeSessionId !== "string" || !text.trim()) return false;
    const replyTo = options.replyToMessage;
    const optimistic = createOptimisticTextMessage(
      text.trim(),
      replyTo
        ? {
            replyTo: {
              content: replyTo.content,
              direction: replyTo.direction,
              externalId: replyTo.externalId,
              id: replyTo.id,
              senderType: replyTo.senderType,
              type: replyTo.type,
            },
          }
        : undefined,
    );
    setMessages((current) => [...current, optimistic]);
    setIsSending(true);
    try {
      const sent = await api.sendText({
        ...(replyTo?.id ? { replyToMessageId: String(replyTo.id) } : {}),
        sessionId: activeSessionId,
        text: text.trim(),
      });
      const localClientId = optimistic.clientId;
      setMessages((current) =>
        current.map((message) =>
          message.clientId === optimistic.clientId
            ? { ...sent, ...(localClientId ? { clientId: localClientId } : {}) }
            : message,
        ),
      );
      if (activeSession) {
        mergeSessions([
          {
            ...activeSession,
            lastMessageAt: sent.createdAt,
            lastMessageContent: formatSentPreview(sent),
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

  const sendMedia = async (input: {
    caption?: string;
    file: File;
    mediaType: CrmWhatsappSendMediaType;
  }) => {
    if (
      !activeSessionId ||
      !activeSession ||
      !canLoadMessages ||
      !canSendMessages
    )
      return false;
    if (typeof activeSessionId !== "string") return false;
    const localUrl = URL.createObjectURL(input.file);
    const caption = input.caption?.trim();
    const optimistic = createOptimisticMediaMessage({
      ...(caption ? { caption } : {}),
      fileName: input.file.name,
      localUrl,
      mediaType: input.mediaType,
      mimeType: input.file.type,
    });
    setMessages((current) => [...current, optimistic]);
    setIsSending(true);
    try {
      const base64 = await readFileAsBase64(input.file);
      const sent = await api.sendMedia({
        base64,
        ...(caption ? { caption } : {}),
        fileName: input.file.name,
        mediaType: input.mediaType,
        mimeType: input.file.type,
        sessionId: activeSessionId,
      });
      URL.revokeObjectURL(localUrl);
      const localClientId = optimistic.clientId;
      setMessages((current) =>
        current.map((message) =>
          message.clientId === optimistic.clientId
            ? { ...sent, ...(localClientId ? { clientId: localClientId } : {}) }
            : message,
        ),
      );
      mergeSessions([
        {
          ...activeSession,
          lastMessageAt: sent.createdAt,
          lastMessageContent: formatSentPreview(sent),
          status: "HUMAN_TAKEOVER",
        },
      ]);
      return true;
    } catch (caught) {
      URL.revokeObjectURL(localUrl);
      setMessages((current) =>
        current.filter((message) => message.clientId !== optimistic.clientId),
      );
      setError(asError(caught));
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const mergeRealtimeMessage = useCallback(
    (message: CrmWhatsappMessage) =>
      setMessages((current) =>
        mergeRealtimeMessageIntoHistory(current, message),
      ),
    [],
  );
  const deleteMessage = useCallback(
    async (message: CrmWhatsappMessage) => {
      if (!canSendMessages) return false;
      setIsSending(true);
      try {
        const updated = await api.deleteMessage(message.id);
        if (updated) patchMessage(updated);
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [api, canSendMessages, patchMessage, setError],
  );
  const removeReaction = useCallback(
    async (message: CrmWhatsappMessage) => {
      if (!canSendMessages) return false;
      setIsSending(true);
      try {
        const updated = await api.removeReaction(message.id);
        if (updated) patchMessage(updated);
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [api, canSendMessages, patchMessage, setError],
  );
  const sendReaction = useCallback(
    async (message: CrmWhatsappMessage, reaction: string) => {
      if (!canSendMessages) return false;
      setIsSending(true);
      try {
        const updated = await api.sendReaction(message.id, { reaction });
        patchMessage(updated);
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [api, canSendMessages, patchMessage, setError],
  );
  const updateRealtimeMessageStatus = useCallback(
    (input: RealtimeMessageStatusUpdate) =>
      setMessages((current) => applyRealtimeMessageStatus(current, input)),
    [],
  );
  return {
    isLoadingMessages,
    isSending,
    deleteMessage,
    listCatalogProducts: structuredMessages.listCatalogProducts,
    mergeRealtimeMessage,
    messages,
    sendCatalog: structuredMessages.sendCatalog,
    sendCatalogProduct: structuredMessages.sendCatalogProduct,
    sendLocation: structuredMessages.sendLocation,
    sendMedia,
    removeReaction,
    sendReaction,
    sendQuickMessage: structuredMessages.sendQuickMessage,
    sendText,
    sendVehicle: structuredMessages.sendVehicle,
    updateRealtimeMessageStatus,
  };
}

export function mergeRealtimeMessageIntoHistory(
  current: WhatsappMessageView[],
  message: CrmWhatsappMessage,
): WhatsappMessageView[] {
  const messageId = String(message.id);
  const mergedById = new Map<string, WhatsappMessageView>();
  for (const currentMessage of current) {
    if (String(currentMessage.id) === messageId) continue;
    if (
      currentMessage.clientId &&
      currentMessage.content === message.content &&
      currentMessage.direction === message.direction &&
      currentMessage.type === message.type
    ) {
      continue;
    }
    mergedById.set(String(currentMessage.id), currentMessage);
  }
  mergedById.set(messageId, message);

  return [...mergedById.values()].sort(
    (left, right) =>
      new Date(left.providerTimestamp ?? left.createdAt).getTime() -
      new Date(right.providerTimestamp ?? right.createdAt).getTime(),
  );
}
