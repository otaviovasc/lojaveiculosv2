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
import { readCrmFailedSendStatus } from "./crmSendOutcome";
import {
  applyRealtimeMessageStatus,
  bufferRealtimeMessageStatus,
  matchesRealtimeMessageStatus,
  mergeCrmMessageStatus,
  type RealtimeMessageStatusUpdate,
} from "./crmMessageStatusUpdates";
import { reconcileCrmMessages } from "./crmMessageReconciliation";
import {
  discardOptimisticStructuredRetry,
  hasOptimisticStructuredRetry,
  retryOptimisticStructuredMessage,
} from "./crmStructuredSender";
import { useCrmWhatsappStructuredMessages } from "./useCrmWhatsappStructuredMessages";

const MESSAGE_PAGE_SIZE = 50;
const MAX_BUFFERED_STATUS_UPDATES = 200;

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
  currentUser?: { id: string; name: string } | null | undefined;
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

type RetryableMediaMessage = {
  base64?: string;
  caption?: string;
  clientId: string;
  cycleId: CrmConversationCycleId;
  file: File;
  idempotencyKey: string;
  localUrl: string;
  mediaType: CrmSendMediaType;
  session: CrmConversationCycle;
};

export function useCrmMessages({
  activeSession,
  activeCycleId,
  api,
  canLoadMessages,
  canSendMessages,
  currentUser = null,
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
  const pendingStatusesBySessionRef = useRef(
    new Map<CrmConversationCycleId, RealtimeMessageStatusUpdate[]>(),
  );
  const retryableMediaRef = useRef(new Map<string, RetryableMediaMessage>());
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
  const activeCycleIdRef = useRef(activeCycleId);
  activeCycleIdRef.current = activeCycleId;
  const requestGenerationRef = useRef(0);
  const releaseMedia = useCallback((clientId: string) => {
    const retry = retryableMediaRef.current.get(clientId);
    if (!retry) return;
    URL.revokeObjectURL(retry.localUrl);
    retryableMediaRef.current.delete(clientId);
  }, []);
  const releaseMediaForCycle = useCallback(
    (cycleId?: CrmConversationCycleId) => {
      for (const retry of retryableMediaRef.current.values()) {
        if (!cycleId || retry.cycleId === cycleId) releaseMedia(retry.clientId);
      }
    },
    [releaseMedia],
  );
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
      for (const message of messagesBySessionRef.current.get(cycleId) ?? []) {
        discardOptimisticStructuredRetry(message);
      }
      messagesBySessionRef.current.delete(cycleId);
      paginationBySessionRef.current.delete(cycleId);
      pendingStatusesBySessionRef.current.delete(cycleId);
      releaseMediaForCycle(cycleId);
      if (activeCycleIdRef.current !== cycleId) return;
      requestGenerationRef.current += 1;
      setMessages([]);
      setLoadedCycleId((current) => (current === cycleId ? null : current));
      setIsLoadingMessages(false);
      setHasOlderMessages(false);
      setIsLoadingOlderMessages(false);
      setOlderMessagesError(false);
    },
    [cancelQueuedText, releaseMediaForCycle],
  );
  const evictAllSessionMessages = useCallback(() => {
    cancelQueuedText(() => true);
    requestGenerationRef.current += 1;
    for (const cycleId of messagesBySessionRef.current.keys()) {
      evictedCycleIdsRef.current.add(cycleId);
    }
    const activeId = activeCycleIdRef.current;
    if (activeId) evictedCycleIdsRef.current.add(activeId);
    for (const sessionMessages of messagesBySessionRef.current.values()) {
      for (const message of sessionMessages) {
        discardOptimisticStructuredRetry(message);
      }
    }
    messagesBySessionRef.current.clear();
    paginationBySessionRef.current.clear();
    pendingStatusesBySessionRef.current.clear();
    releaseMediaForCycle();
    setMessages([]);
    setLoadedCycleId(null);
    setIsLoadingMessages(false);
    setHasOlderMessages(false);
    setIsLoadingOlderMessages(false);
    setOlderMessagesError(false);
  }, [cancelQueuedText, releaseMediaForCycle]);

  const reconcileSessionMessages = useCallback(
    (
      cycleId: CrmConversationCycleId,
      incoming: CrmMessage | readonly CrmMessage[],
    ) => {
      updateSessionMessages(cycleId, (current) => {
        const result = reconcileCrmMessages(
          current,
          incoming,
          pendingStatusesBySessionRef.current.get(cycleId) ?? [],
        );
        pendingStatusesBySessionRef.current.set(
          cycleId,
          result.pendingStatusUpdates,
        );
        for (const previous of current) {
          if (!previous.clientId) continue;
          const reconciled = result.messages.find(
            (message) => message.clientId === previous.clientId,
          );
          if (reconciled && isConfirmedMessageStatus(reconciled.status)) {
            releaseMedia(previous.clientId);
            discardOptimisticStructuredRetry(previous);
          }
        }
        return result.messages;
      });
    },
    [releaseMedia, updateSessionMessages],
  );
  const setStructuredMessages = useCallback(
    (update: SetStateAction<CrmMessageView[]>) => {
      if (!activeCycleId) return;
      updateSessionMessages(activeCycleId, (current) => {
        const next = typeof update === "function" ? update(current) : update;
        const reconciled = reconcileCrmMessages(
          next,
          [],
          pendingStatusesBySessionRef.current.get(activeCycleId) ?? [],
        );
        pendingStatusesBySessionRef.current.set(
          activeCycleId,
          reconciled.pendingStatusUpdates,
        );
        const currentMessageKeys = new Set(current.map(messageIdentityKey));
        return reconciled.messages.map((message) =>
          !currentMessageKeys.has(messageIdentityKey(message)) &&
          message.direction === "OUTBOUND" &&
          message.status === "PENDING"
            ? attachOptimisticSender(message, currentUser)
            : message,
        );
      });
    },
    [activeCycleId, currentUser, updateSessionMessages],
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
      for (const sessionMessages of messagesBySessionRef.current.values()) {
        for (const message of sessionMessages) {
          discardOptimisticStructuredRetry(message);
        }
      }
      releaseMediaForCycle();
    };
  }, [releaseMediaForCycle]);

  useEffect(() => {
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
            reconcileSessionMessages(activeCycleId, nextMessages);
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
  }, [activeCycleId, api, canLoadMessages, reconcileSessionMessages, setError]);

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
        reconcileSessionMessages(cycleId, nextMessages);
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
  }, [api, canLoadMessages, reconcileSessionMessages]);

  const patchMessage = useCallback(
    (message: CrmMessage) => {
      const cycleId = activeCycleIdRef.current;
      if (!cycleId) return;
      updateSessionMessages(cycleId, (current) =>
        current.map((item) => (item.id === message.id ? message : item)),
      );
    },
    [updateSessionMessages],
  );

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
          reconcileSessionMessages(queued.cycleId, sent);
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
          let confirmed = false;
          updateSessionMessages(queued.cycleId, (current) =>
            current.map((message) => {
              if (message.clientId !== queued.clientId) return message;
              confirmed = isConfirmedMessageStatus(message.status);
              return confirmed
                ? message
                : {
                    ...message,
                    metadata: {
                      ...message.metadata,
                      idempotencyKey: queued.idempotencyKey,
                    },
                    status: mergeCrmMessageStatus(
                      message.status,
                      readCrmFailedSendStatus(caught),
                    ),
                  };
            }),
          );
          if (!confirmed) setError(asError(caught));
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
  }, [
    api,
    mergeCycles,
    reconcileSessionMessages,
    setError,
    syncPendingTextCount,
    updateSessionMessages,
  ]);

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
    const optimistic = attachOptimisticSender(
      createOptimisticTextMessage(text.trim(), {
        ...(replyTo
          ? {
              replyTo: {
                content: replyTo.content,
                direction: replyTo.direction,
                externalId: replyTo.externalId,
                id: replyTo.id,
                ...readReplySender(replyTo),
                senderOrigin: replyTo.senderOrigin,
                senderType: replyTo.senderType,
                type: replyTo.type,
              },
            }
          : {}),
      }),
      currentUser,
    );
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

  const executeMediaSend = useCallback(
    async (retry: RetryableMediaMessage) => {
      updateSessionMessages(retry.cycleId, (current) =>
        current.map((message) =>
          matchesRetryableMediaAttempt(message, retry)
            ? withLocalUpload(message, retry.idempotencyKey, "preparing")
            : message,
        ),
      );
      setIsSending(true);
      try {
        const base64 = retry.base64 ?? (await readFileAsBase64(retry.file));
        if (!retry.base64) {
          retryableMediaRef.current.set(retry.clientId, {
            ...retry,
            base64,
          });
        }
        updateSessionMessages(retry.cycleId, (current) =>
          current.map((message) =>
            matchesRetryableMediaAttempt(message, retry)
              ? withLocalUpload(message, retry.idempotencyKey, "uploading")
              : message,
          ),
        );
        const sent = await api.sendMedia({
          base64,
          ...(retry.caption ? { caption: retry.caption } : {}),
          fileName: retry.file.name,
          idempotencyKey: retry.idempotencyKey,
          mediaType: retry.mediaType,
          mimeType: retry.file.type,
          cycleId: retry.cycleId,
        });
        reconcileSessionMessages(retry.cycleId, sent);
        mergeCycles([
          {
            ...retry.session,
            lastMessageAt: sent.createdAt,
            lastMessageContent: formatSentPreview(sent),
            status: "HUMAN_TAKEOVER",
          },
        ]);
        return true;
      } catch (caught) {
        let confirmed = false;
        updateSessionMessages(retry.cycleId, (current) =>
          current.map((message) => {
            if (!matchesRetryableMediaAttempt(message, retry)) return message;
            confirmed = isConfirmedMessageStatus(message.status);
            return {
              ...message,
              metadata: withoutLocalUpload(
                message.metadata,
                retry.idempotencyKey,
              ),
              status: mergeCrmMessageStatus(
                message.status,
                readCrmFailedSendStatus(caught),
              ),
            };
          }),
        );
        if (confirmed) {
          releaseMedia(retry.clientId);
          return true;
        }
        setError(asError(caught));
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [
      api,
      mergeCycles,
      reconcileSessionMessages,
      releaseMedia,
      setError,
      updateSessionMessages,
    ],
  );

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
    const optimistic = attachOptimisticSender(
      createOptimisticMediaMessage({
        ...(caption ? { caption } : {}),
        fileName: input.file.name,
        localUrl,
        mediaType: input.mediaType,
        mimeType: input.file.type,
      }),
      currentUser,
    );
    const idempotencyKey = optimistic.clientId ?? crypto.randomUUID();
    const clientId = optimistic.clientId ?? idempotencyKey;
    const retry = {
      ...(caption ? { caption } : {}),
      clientId,
      cycleId: activeCycleId,
      file: input.file,
      idempotencyKey,
      localUrl,
      mediaType: input.mediaType,
      session: activeSession,
    };
    retryableMediaRef.current.set(clientId, retry);
    updateSessionMessages(activeCycleId, (current) => [
      ...current,
      withLocalUpload({ ...optimistic, clientId }, idempotencyKey, "preparing"),
    ]);
    return executeMediaSend(retry);
  };

  const mergeRealtimeMessage = useCallback(
    (message: CrmMessage) => {
      const cycleId = activeCycleIdRef.current;
      if (!cycleId) return;
      reconcileSessionMessages(cycleId, message);
    },
    [reconcileSessionMessages],
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
      updateSessionMessages(cycleId, (current) => {
        if (
          current.some((message) =>
            matchesRealtimeMessageStatus(message, input),
          )
        ) {
          return applyRealtimeMessageStatus(current, input);
        }
        const pending = pendingStatusesBySessionRef.current.get(cycleId) ?? [];
        pendingStatusesBySessionRef.current.set(
          cycleId,
          bufferRealtimeMessageStatus(
            pending,
            input,
            MAX_BUFFERED_STATUS_UPDATES,
          ),
        );
        return current;
      });
    },
    [updateSessionMessages],
  );

  const retryMessage = useCallback(
    async (message: CrmMessageView) => {
      if (!canSendMessages || message.status !== "FAILED") return false;
      if (hasOptimisticStructuredRetry(message)) {
        return retryOptimisticStructuredMessage(message);
      }
      const mediaRetry = message.clientId
        ? retryableMediaRef.current.get(message.clientId)
        : undefined;
      if (mediaRetry) {
        const retry = { ...mediaRetry, idempotencyKey: crypto.randomUUID() };
        retryableMediaRef.current.set(retry.clientId, retry);
        return executeMediaSend(retry);
      }
      if (message.type !== "TEXT") return false;
      const cycleId = activeCycleIdRef.current;
      if (!cycleId) return false;
      const idempotencyKey = crypto.randomUUID();
      updateSessionMessages(cycleId, (current) =>
        current.map((item) =>
          item.clientId === message.clientId || item.id === message.id
            ? resetMessageAttempt(item, idempotencyKey)
            : item,
        ),
      );
      try {
        const sent = await api.sendText({
          cycleId: String(cycleId),
          idempotencyKey,
          ...readReplyId(message),
          text: message.content,
        });
        reconcileSessionMessages(cycleId, sent);
        return true;
      } catch (caught) {
        let confirmed = false;
        updateSessionMessages(cycleId, (current) =>
          current.map((item) => {
            if (item.clientId !== message.clientId && item.id !== message.id) {
              return item;
            }
            confirmed = isConfirmedMessageStatus(item.status);
            return {
              ...item,
              status: mergeCrmMessageStatus(
                item.status,
                readCrmFailedSendStatus(caught),
              ),
            };
          }),
        );
        if (!confirmed) setError(asError(caught));
        return confirmed;
      }
    },
    [
      api,
      canSendMessages,
      executeMediaSend,
      reconcileSessionMessages,
      setError,
      updateSessionMessages,
    ],
  );

  const reconcileMessage = useCallback(
    async (message: CrmMessageView) => {
      if (
        message.status !== "INDETERMINATE" &&
        message.status !== "PROVIDER_UNKNOWN"
      ) {
        return false;
      }
      const cycleId = activeCycleIdRef.current;
      if (!cycleId) return false;
      try {
        const serverMessages = await api.listMessages(cycleId, {
          limit: MESSAGE_PAGE_SIZE,
          offset: 0,
        });
        let reconciled = false;
        updateSessionMessages(cycleId, (current) => {
          const result = reconcileCrmMessages(
            current,
            serverMessages,
            pendingStatusesBySessionRef.current.get(cycleId) ?? [],
          );
          pendingStatusesBySessionRef.current.set(
            cycleId,
            result.pendingStatusUpdates,
          );
          const candidate = result.messages.find((item) =>
            message.clientId
              ? item.clientId === message.clientId
              : String(item.id) === String(message.id),
          );
          reconciled = Boolean(
            candidate &&
            candidate.status !== "INDETERMINATE" &&
            candidate.status !== "PROVIDER_UNKNOWN",
          );
          if (candidate && isConfirmedMessageStatus(candidate.status)) {
            releaseMedia(candidate.clientId ?? String(candidate.id));
            discardOptimisticStructuredRetry(candidate);
          }
          return result.messages;
        });
        return reconciled;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, releaseMedia, setError, updateSessionMessages],
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
    reconcileMessage,
    retryMessage,
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
  current: CrmMessageView[],
  message: CrmMessage,
): CrmMessageView[] {
  return reconcileCrmMessages(current, message).messages;
}

function attachOptimisticSender(
  message: CrmMessageView,
  currentUser: { id: string; name: string } | null,
): CrmMessageView {
  const name = currentUser?.name.trim();
  if (!currentUser || !name) return message;
  return {
    ...message,
    senderUser: { id: currentUser.id, name },
  };
}

function messageIdentityKey(message: CrmMessageView) {
  return message.clientId ?? String(message.id);
}

function readReplySender(message: CrmMessage) {
  const senderUser = message.senderUser;
  if (!senderUser?.name.trim()) return {};
  return {
    senderUser: { id: senderUser.id, name: senderUser.name.trim() },
  };
}

function readReplyId(message: CrmMessageView) {
  const replyTo = message.metadata?.replyTo;
  if (!replyTo || typeof replyTo !== "object" || !("id" in replyTo)) return {};
  const id = replyTo.id;
  return typeof id === "string" || typeof id === "number"
    ? { replyToMessageId: String(id) }
    : {};
}

function withLocalUpload(
  message: CrmMessageView,
  idempotencyKey: string,
  phase: "preparing" | "uploading",
): CrmMessageView {
  const previousAttempt = { ...message };
  delete previousAttempt.clientRequestId;
  delete previousAttempt.externalId;
  return {
    ...previousAttempt,
    id: message.clientId ?? message.id,
    metadata: {
      ...message.metadata,
      idempotencyKey,
      localUpload: { phase },
    },
    status: "PENDING",
  };
}

function matchesRetryableMediaAttempt(
  message: CrmMessageView,
  retry: Pick<RetryableMediaMessage, "clientId" | "idempotencyKey">,
) {
  return (
    message.clientId === retry.clientId ||
    String(message.id) === retry.clientId ||
    message.metadata?.idempotencyKey === retry.idempotencyKey
  );
}

function resetMessageAttempt(
  message: CrmMessageView,
  idempotencyKey: string,
): CrmMessageView {
  const previousAttempt = { ...message };
  delete previousAttempt.clientRequestId;
  delete previousAttempt.externalId;
  return {
    ...previousAttempt,
    id: message.clientId ?? `local-retry-${idempotencyKey}`,
    metadata: { ...previousAttempt.metadata, idempotencyKey },
    status: "PENDING",
  };
}

function withoutLocalUpload(
  metadata: CrmMessageView["metadata"],
  idempotencyKey: string,
) {
  const { localUpload: _localUpload, ...retained } = metadata ?? {};
  return { ...retained, idempotencyKey };
}

function isConfirmedMessageStatus(status: CrmMessage["status"]) {
  return status === "SENT" || status === "DELIVERED" || status === "READ";
}
