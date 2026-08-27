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
  hasMessageAccess?: boolean;
  hasSendPermission?: boolean;
  mergeCycles: (nextSessions: CrmConversationCycle[]) => void;
  scopeKey?: string | null;
  setError: (error: Error) => void;
};

type MessagePaginationState = {
  hasOlderMessages: boolean;
  serverMessageIds: Set<string>;
};

type QueuedTextMessage = {
  clientId: string;
  connectionId: string | null;
  cycleId: CrmConversationCycleId;
  idempotencyKey: string;
  optimistic: CrmMessageView;
  replyToMessageId: string | null;
  session: CrmConversationCycle;
  text: string;
};

export function useCrmMessages({
  activeSession,
  activeCycleId,
  api,
  canLoadMessages,
  canSendMessages,
  hasMessageAccess = true,
  hasSendPermission = true,
  mergeCycles,
  scopeKey = null,
  setError,
}: UseCrmMessagesOptions) {
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadedCycleId, setLoadedCycleId] =
    useState<CrmConversationCycleId | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingTextMessageCount, setPendingTextMessageCount] = useState(0);
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
  const pendingTextClientIdsRef = useRef(new Set<string>());
  const textQueueRef = useRef<QueuedTextMessage[]>([]);
  const activeTextItemRef = useRef<QueuedTextMessage | null>(null);
  const isDrainingTextQueueRef = useRef(false);
  const mountedRef = useRef(true);
  const messagesRef = useRef<CrmMessageView[]>([]);
  messagesRef.current = messages;
  const activeCycleIdRef = useRef(activeCycleId);
  activeCycleIdRef.current = activeCycleId;
  const previousCycleIdRef = useRef<CrmConversationCycleId | null>(null);
  const requestGenerationRef = useRef(0);
  const syncPendingTextCount = useCallback(() => {
    if (mountedRef.current) {
      setPendingTextMessageCount(pendingTextClientIdsRef.current.size);
    }
  }, []);
  const cancelQueuedText = useCallback(
    (shouldCancel: (item: QueuedTextMessage) => boolean) => {
      const queued = textQueueRef.current;
      textQueueRef.current = queued.filter((item) => {
        if (!shouldCancel(item)) return true;
        pendingTextClientIdsRef.current.delete(item.clientId);
        return false;
      });
      const active = activeTextItemRef.current;
      if (active && shouldCancel(active)) {
        pendingTextClientIdsRef.current.delete(active.clientId);
      }
      syncPendingTextCount();
    },
    [syncPendingTextCount],
  );
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
      cancelQueuedText((item) => item.cycleId === cycleId);
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
    [cancelQueuedText],
  );
  const evictAllSessionMessages = useCallback(() => {
    cancelQueuedText(() => true);
    requestGenerationRef.current += 1;
    for (const cycleId of messagesBySessionRef.current.keys()) {
      evictedCycleIdsRef.current.add(cycleId);
    }
    const activeId = activeCycleIdRef.current;
    if (activeId) evictedCycleIdsRef.current.add(activeId);
    messagesBySessionRef.current.clear();
    paginationBySessionRef.current.clear();
    previousCycleIdRef.current = null;
    setMessages([]);
    setLoadedCycleId(null);
    setIsLoadingMessages(false);
    setHasOlderMessages(false);
    setIsLoadingOlderMessages(false);
    setOlderMessagesError(false);
  }, [cancelQueuedText]);
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

  const previousScopeKeyRef = useRef(scopeKey);
  useEffect(() => {
    if (previousScopeKeyRef.current !== scopeKey) {
      previousScopeKeyRef.current = scopeKey;
      evictAllSessionMessages();
    }
  }, [evictAllSessionMessages, scopeKey]);

  useEffect(() => {
    if (!hasMessageAccess) {
      evictAllSessionMessages();
      return;
    }
    if (!hasSendPermission) cancelQueuedText(() => true);
  }, [
    cancelQueuedText,
    evictAllSessionMessages,
    hasMessageAccess,
    hasSendPermission,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingTextClientIdsRef.current.clear();
      textQueueRef.current = [];
      activeTextItemRef.current = null;
    };
  }, []);

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
              mergeServerMessagesByIdentity(current, nextMessages),
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
          mergeServerMessagesByIdentity(current, nextMessages),
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

  const drainTextQueue = useCallback(async () => {
    if (isDrainingTextQueueRef.current) return;
    isDrainingTextQueueRef.current = true;
    try {
      while (textQueueRef.current.length) {
        const queued = textQueueRef.current.shift();
        if (!queued || !pendingTextClientIdsRef.current.has(queued.clientId)) {
          continue;
        }
        activeTextItemRef.current = queued;
        try {
          const sent = await api.sendText({
            idempotencyKey: queued.idempotencyKey,
            ...(queued.replyToMessageId
              ? { replyToMessageId: queued.replyToMessageId }
              : {}),
            cycleId: queued.cycleId,
            text: queued.text,
          });
          if (!pendingTextClientIdsRef.current.has(queued.clientId)) continue;
          updateSessionMessages(queued.cycleId, (current) =>
            current
              .filter(
                (message) =>
                  message.clientId === queued.clientId ||
                  String(message.id) !== String(sent.id),
              )
              .map((message) =>
                message.clientId === queued.clientId
                  ? { ...sent, clientId: queued.clientId }
                  : message,
              ),
          );
          mergeCycles([
            {
              ...queued.session,
              lastMessageAt: sent.createdAt,
              lastMessageContent: formatSentPreview(sent),
              status: "HUMAN_TAKEOVER",
            },
          ]);
        } catch (caught) {
          if (!pendingTextClientIdsRef.current.has(queued.clientId)) continue;
          updateSessionMessages(queued.cycleId, (current) =>
            current.map((message) =>
              message.clientId === queued.clientId
                ? {
                    ...message,
                    metadata: {
                      ...message.metadata,
                      idempotencyKey: queued.idempotencyKey,
                    },
                    status: readFailedSendStatus(caught),
                  }
                : message,
            ),
          );
          setError(asError(caught));
        } finally {
          pendingTextClientIdsRef.current.delete(queued.clientId);
          if (activeTextItemRef.current?.clientId === queued.clientId) {
            activeTextItemRef.current = null;
          }
          syncPendingTextCount();
        }
      }
    } finally {
      isDrainingTextQueueRef.current = false;
    }
  }, [api, mergeCycles, setError, syncPendingTextCount, updateSessionMessages]);

  const sendText = (text: string, options: SendTextOptions = {}) => {
    if (
      !activeCycleId ||
      !activeSession ||
      !canLoadMessages ||
      !canSendMessages
    )
      return Promise.resolve(false);
    if (typeof activeCycleId !== "string" || !text.trim()) {
      return Promise.resolve(false);
    }
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
    const clientId = optimistic.clientId ?? idempotencyKey;
    const queuedOptimistic = {
      ...optimistic,
      clientId,
      metadata: { ...optimistic.metadata, idempotencyKey },
    };
    const queued: QueuedTextMessage = {
      clientId,
      connectionId: activeSession.connection?.id
        ? String(activeSession.connection.id)
        : null,
      cycleId: activeCycleId,
      idempotencyKey,
      optimistic: queuedOptimistic,
      replyToMessageId: replyTo?.id ? String(replyTo.id) : null,
      session: activeSession,
      text: text.trim(),
    };
    updateSessionMessages(activeCycleId, (current) => [
      ...current,
      queued.optimistic,
    ]);
    pendingTextClientIdsRef.current.add(clientId);
    textQueueRef.current.push(queued);
    syncPendingTextCount();
    void drainTextQueue();
    return Promise.resolve(true);
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
      if (!canSendMessages || pendingTextClientIdsRef.current.size > 0) {
        return false;
      }
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
    evictAllSessionMessages,
    evictSessionMessages,
    hasPendingTextMessages: pendingTextMessageCount > 0,
    hasOlderMessages,
    isLoadingMessages,
    isLoadingOlderMessages,
    hasLoadedActiveMessages: loadedCycleId === activeCycleId,
    isBlockingMutation: isSending || pendingTextMessageCount > 0,
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

function mergeServerMessagesByIdentity(
  current: CrmMessageView[],
  serverMessages: CrmMessage[],
) {
  const serverIds = new Set(
    serverMessages.map((message) => String(message.id)),
  );
  const retained = current.filter(
    (message) => !serverIds.has(String(message.id)),
  );
  const next = [...serverMessages, ...retained].sort(
    (left, right) =>
      new Date(left.providerTimestamp ?? left.createdAt).getTime() -
      new Date(right.providerTimestamp ?? right.createdAt).getTime(),
  );
  return haveSameMessageSnapshot(current, next) ? current : next;
}
