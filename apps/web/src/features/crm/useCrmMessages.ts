import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import { asError } from "./crmConversationHookSupport";
import { readFileAsBase64 } from "./crmMediaFiles";
import {
  createOptimisticMediaMessage,
  createOptimisticTextMessage,
  haveSameMessageSnapshot,
  mergeMessagesFromServer,
  type CrmMessageView,
} from "./crmConversationModel";
import type {
  CrmMessage,
  CrmSendMediaType,
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";
import { formatSentPreview } from "./crmSentPreview";
import {
  applyRealtimeMessageStatus,
  type RealtimeMessageStatusUpdate,
} from "./crmMessageStatusUpdates";
import { useCrmWhatsappStructuredMessages } from "./useCrmWhatsappStructuredMessages";

const MESSAGE_PAGE_SIZE = 50;

type SendTextOptions = {
  idempotencyKey?: string;
  replyToMessage?: CrmMessage | null;
};

type UseCrmMessagesOptions = {
  activeSession: CrmConversationCycle | null;
  activeCycleId: CrmConversationCycleId | null;
  api: CrmConversationApi;
  canLoadMessages: boolean;
  canSendMessages: boolean;
  mergeCycles: (nextSessions: CrmConversationCycle[]) => void;
  setError: (error: Error) => void;
};

type MessagePaginationState = {
  hasOlderMessages: boolean;
  serverMessageIds: Set<string>;
};

export function useCrmMessages({
  activeSession,
  activeCycleId,
  api,
  canLoadMessages,
  canSendMessages,
  mergeCycles,
  setError,
}: UseCrmMessagesOptions) {
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadedCycleId, setLoadedCycleId] =
    useState<CrmConversationCycleId | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<CrmMessageView[]>([]);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [olderMessagesError, setOlderMessagesError] = useState(false);
  const messagesBySessionRef = useRef(
    new Map<CrmConversationCycleId, CrmMessageView[]>(),
  );
  const paginationBySessionRef = useRef(
    new Map<CrmConversationCycleId, MessagePaginationState>(),
  );
  const olderRequestRef = useRef<{
    cycleId: CrmConversationCycleId;
    promise: Promise<boolean>;
    token: symbol;
  } | null>(null);
  const evictedCycleIdsRef = useRef(new Set<CrmConversationCycleId>());
  const messagesRef = useRef<CrmMessageView[]>([]);
  messagesRef.current = messages;
  const activeCycleIdRef = useRef(activeCycleId);
  activeCycleIdRef.current = activeCycleId;
  const previousCycleIdRef = useRef<CrmConversationCycleId | null>(null);
  const requestGenerationRef = useRef(0);
  const updateSessionMessages = useCallback(
    (
      cycleId: CrmConversationCycleId,
      update: SetStateAction<CrmMessageView[]>,
    ) => {
      if (evictedCycleIdsRef.current.has(cycleId)) return;
      const current = messagesBySessionRef.current.get(cycleId) ?? [];
      const next = typeof update === "function" ? update(current) : update;
      if (haveSameMessageSnapshot(current, next)) return;
      messagesBySessionRef.current.set(cycleId, next);
      if (activeCycleIdRef.current === cycleId) setMessages(next);
    },
    [],
  );
  const evictSessionMessages = useCallback(
    (cycleId: CrmConversationCycleId) => {
      evictedCycleIdsRef.current.add(cycleId);
      messagesBySessionRef.current.delete(cycleId);
      paginationBySessionRef.current.delete(cycleId);
      if (previousCycleIdRef.current === cycleId) {
        previousCycleIdRef.current = null;
      }
      if (activeCycleIdRef.current !== cycleId) return;
      requestGenerationRef.current += 1;
      setMessages([]);
      setLoadedCycleId((current) => (current === cycleId ? null : current));
      setIsLoadingMessages(false);
      setHasOlderMessages(false);
      setIsLoadingOlderMessages(false);
      setOlderMessagesError(false);
    },
    [],
  );
  const setStructuredMessages = useCallback(
    (update: SetStateAction<CrmMessageView[]>) => {
      if (activeCycleId) updateSessionMessages(activeCycleId, update);
    },
    [activeCycleId, updateSessionMessages],
  );
  const structuredMessages = useCrmWhatsappStructuredMessages({
    activeSession,
    activeCycleId,
    api,
    canLoadMessages,
    canSendMessages,
    mergeCycles,
    setError,
    setIsSending,
    setMessages: setStructuredMessages,
  });

  useEffect(() => {
    const previousCycleId = previousCycleIdRef.current;
    if (
      previousCycleId &&
      previousCycleId !== activeCycleId &&
      !evictedCycleIdsRef.current.has(previousCycleId)
    ) {
      messagesBySessionRef.current.set(previousCycleId, messagesRef.current);
    }
    previousCycleIdRef.current = activeCycleId;
    if (activeCycleId) {
      setMessages(
        evictedCycleIdsRef.current.has(activeCycleId)
          ? []
          : (messagesBySessionRef.current.get(activeCycleId) ?? []),
      );
      setHasOlderMessages(
        paginationBySessionRef.current.get(activeCycleId)?.hasOlderMessages ??
          false,
      );
    } else {
      setHasOlderMessages(false);
    }
    setIsLoadingOlderMessages(false);
    setOlderMessagesError(false);
  }, [activeCycleId]);

  useEffect(() => {
    if (activeCycleId && !evictedCycleIdsRef.current.has(activeCycleId)) {
      messagesBySessionRef.current.set(activeCycleId, messages);
    }
  }, [activeCycleId, messages]);

  useEffect(() => {
    const requestGeneration = ++requestGenerationRef.current;
    if (
      !activeCycleId ||
      !canLoadMessages ||
      typeof activeCycleId !== "string"
    ) {
      setMessages([]);
      setLoadedCycleId(null);
      setIsLoadingMessages(false);
      setHasOlderMessages(false);
      setIsLoadingOlderMessages(false);
      setOlderMessagesError(false);
      return;
    }
    let active = true;
    let inFlight: Promise<void> | null = null;
    let inFlightToken: symbol | null = null;
    const hasCachedMessages =
      (messagesBySessionRef.current.get(activeCycleId)?.length ?? 0) > 0;
    if (!hasCachedMessages) {
      setIsLoadingMessages(true);
    }
    const loadMessages = () => {
      if (inFlight) return inFlight;
      const requestToken = Symbol("crm-message-poll");
      const request = (async () => {
        try {
          const nextMessages = await api.listMessages(activeCycleId, {
            limit: MESSAGE_PAGE_SIZE,
            offset: 0,
          });
          if (active && requestGeneration === requestGenerationRef.current) {
            evictedCycleIdsRef.current.delete(activeCycleId);
            const existingPagination =
              paginationBySessionRef.current.get(activeCycleId);
            const pagination = existingPagination ?? {
              hasOlderMessages: nextMessages.length === MESSAGE_PAGE_SIZE,
              serverMessageIds: new Set<string>(),
            };
            for (const message of nextMessages) {
              pagination.serverMessageIds.add(String(message.id));
            }
            if (nextMessages.length < MESSAGE_PAGE_SIZE) {
              pagination.hasOlderMessages = false;
            }
            paginationBySessionRef.current.set(activeCycleId, pagination);
            setMessages((current) =>
              mergeMessagesFromServer(current, nextMessages),
            );
            setLoadedCycleId(activeCycleId);
            setHasOlderMessages(pagination.hasOlderMessages);
          }
        } finally {
          if (inFlightToken === requestToken) {
            inFlight = null;
            inFlightToken = null;
          }
        }
      })();
      inFlightToken = requestToken;
      inFlight = request;
      return request;
    };
    void loadMessages()
      .catch((caught) => {
        if (active && requestGeneration === requestGenerationRef.current)
          setError(asError(caught));
      })
      .finally(() => {
        if (active && requestGeneration === requestGenerationRef.current) {
          setIsLoadingMessages(false);
        }
      });
    const interval = window.setInterval(() => {
      void loadMessages().catch(() => undefined);
    }, 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [activeCycleId, api, canLoadMessages, setError]);

  const loadOlderMessages = useCallback(() => {
    const cycleId = activeCycleIdRef.current;
    if (!cycleId || !canLoadMessages) return Promise.resolve(false);
    const pagination = paginationBySessionRef.current.get(cycleId);
    if (!pagination?.hasOlderMessages) return Promise.resolve(false);
    const existingRequest = olderRequestRef.current;
    if (existingRequest?.cycleId === cycleId) return existingRequest.promise;

    const requestGeneration = requestGenerationRef.current;
    const requestToken = Symbol("crm-older-messages");
    setIsLoadingOlderMessages(true);
    setOlderMessagesError(false);
    const promise = (async () => {
      try {
        const nextMessages = await api.listMessages(cycleId, {
          limit: MESSAGE_PAGE_SIZE,
          offset: pagination.serverMessageIds.size,
        });
        if (
          activeCycleIdRef.current !== cycleId ||
          requestGeneration !== requestGenerationRef.current
        ) {
          return false;
        }
        let newMessageCount = 0;
        for (const message of nextMessages) {
          const messageId = String(message.id);
          if (!pagination.serverMessageIds.has(messageId)) newMessageCount += 1;
          pagination.serverMessageIds.add(messageId);
        }
        pagination.hasOlderMessages =
          nextMessages.length === MESSAGE_PAGE_SIZE && newMessageCount > 0;
        paginationBySessionRef.current.set(cycleId, pagination);
        updateSessionMessages(cycleId, (current) =>
          mergeMessagesFromServer(current, nextMessages),
        );
        setHasOlderMessages(pagination.hasOlderMessages);
        return newMessageCount > 0;
      } catch {
        if (
          activeCycleIdRef.current === cycleId &&
          requestGeneration === requestGenerationRef.current
        ) {
          setOlderMessagesError(true);
        }
        return false;
      } finally {
        if (olderRequestRef.current?.token === requestToken) {
          olderRequestRef.current = null;
          if (
            activeCycleIdRef.current === cycleId &&
            requestGeneration === requestGenerationRef.current
          ) {
            setIsLoadingOlderMessages(false);
          }
        }
      }
    })();
    olderRequestRef.current = {
      cycleId,
      promise,
      token: requestToken,
    };
    return promise;
  }, [api, canLoadMessages, updateSessionMessages]);

  const patchMessage = useCallback((message: CrmMessage) => {
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? message : item)),
    );
  }, []);

  const sendText = async (text: string, options: SendTextOptions = {}) => {
    if (
      !activeCycleId ||
      !activeSession ||
      !canLoadMessages ||
      !canSendMessages
    )
      return false;
    if (typeof activeCycleId !== "string" || !text.trim()) return false;
    const replyTo = options.replyToMessage;
    const optimistic = createOptimisticTextMessage(text.trim(), {
      ...(activeSession.assignedMember?.name
        ? { authorName: activeSession.assignedMember.name }
        : {}),
      ...(replyTo
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
        : {}),
    });
    const idempotencyKey =
      options.idempotencyKey ?? optimistic.clientId ?? crypto.randomUUID();
    updateSessionMessages(activeCycleId, (current) => [...current, optimistic]);
    setIsSending(true);
    try {
      const sent = await api.sendText({
        idempotencyKey,
        ...(replyTo?.id ? { replyToMessageId: String(replyTo.id) } : {}),
        cycleId: activeCycleId,
        text: text.trim(),
      });
      const localClientId = optimistic.clientId;
      updateSessionMessages(activeCycleId, (current) =>
        current.map((message) =>
          message.clientId === optimistic.clientId
            ? { ...sent, ...(localClientId ? { clientId: localClientId } : {}) }
            : message,
        ),
      );
      if (activeSession) {
        mergeCycles([
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
      updateSessionMessages(activeCycleId, (current) =>
        current.map((message) =>
          message.clientId === optimistic.clientId
            ? {
                ...message,
                metadata: { ...message.metadata, idempotencyKey },
                status: readFailedSendStatus(caught),
              }
            : message,
        ),
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
    mediaType: CrmSendMediaType;
  }) => {
    if (
      !activeCycleId ||
      !activeSession ||
      !canLoadMessages ||
      !canSendMessages
    )
      return false;
    if (typeof activeCycleId !== "string") return false;
    const localUrl = URL.createObjectURL(input.file);
    const caption = input.caption?.trim();
    const optimistic = createOptimisticMediaMessage({
      ...(caption ? { caption } : {}),
      fileName: input.file.name,
      localUrl,
      mediaType: input.mediaType,
      mimeType: input.file.type,
    });
    const idempotencyKey = optimistic.clientId ?? crypto.randomUUID();
    updateSessionMessages(activeCycleId, (current) => [...current, optimistic]);
    setIsSending(true);
    try {
      const base64 = await readFileAsBase64(input.file);
      const sent = await api.sendMedia({
        base64,
        ...(caption ? { caption } : {}),
        fileName: input.file.name,
        idempotencyKey,
        mediaType: input.mediaType,
        mimeType: input.file.type,
        cycleId: activeCycleId,
      });
      URL.revokeObjectURL(localUrl);
      const localClientId = optimistic.clientId;
      updateSessionMessages(activeCycleId, (current) =>
        current.map((message) =>
          message.clientId === optimistic.clientId
            ? { ...sent, ...(localClientId ? { clientId: localClientId } : {}) }
            : message,
        ),
      );
      mergeCycles([
        {
          ...activeSession,
          lastMessageAt: sent.createdAt,
          lastMessageContent: formatSentPreview(sent),
          status: "HUMAN_TAKEOVER",
        },
      ]);
      return true;
    } catch (caught) {
      updateSessionMessages(activeCycleId, (current) =>
        current.map((message) =>
          message.clientId === optimistic.clientId
            ? {
                ...message,
                metadata: { ...message.metadata, idempotencyKey },
                status: readFailedSendStatus(caught),
              }
            : message,
        ),
      );
      setError(asError(caught));
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const mergeRealtimeMessage = useCallback(
    (message: CrmMessage) => {
      const cycleId = activeCycleIdRef.current;
      if (!cycleId) return;
      updateSessionMessages(cycleId, (current) =>
        mergeRealtimeMessageIntoHistory(current, message),
      );
    },
    [updateSessionMessages],
  );
  const deleteMessage = useCallback(
    async (message: CrmMessage) => {
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
    async (message: CrmMessage) => {
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
    async (message: CrmMessage, reaction: string) => {
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
    (input: RealtimeMessageStatusUpdate) => {
      const cycleId = activeCycleIdRef.current;
      if (!cycleId) return;
      updateSessionMessages(cycleId, (current) =>
        applyRealtimeMessageStatus(current, input),
      );
    },
    [updateSessionMessages],
  );
  return {
    evictSessionMessages,
    hasOlderMessages,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasLoadedActiveMessages: loadedCycleId === activeCycleId,
    isSending,
    deleteMessage,
    listCatalogProducts: structuredMessages.listCatalogProducts,
    loadOlderMessages,
    mergeRealtimeMessage,
    messages,
    olderMessagesError,
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

function readFailedSendStatus(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code).toLocaleLowerCase("en-US")
      : "";
  return code.includes("indeterminate") || code.includes("unconfirmed")
    ? "INDETERMINATE"
    : "FAILED";
}

export function mergeRealtimeMessageIntoHistory(
  current: CrmMessageView[],
  message: CrmMessage,
): CrmMessageView[] {
  const messageId = String(message.id);
  const mergedById = new Map<string, CrmMessageView>();
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

  const next = [...mergedById.values()].sort(
    (left, right) =>
      new Date(left.providerTimestamp ?? left.createdAt).getTime() -
      new Date(right.providerTimestamp ?? right.createdAt).getTime(),
  );
  return haveSameMessageSnapshot(current, next) ? current : next;
}
