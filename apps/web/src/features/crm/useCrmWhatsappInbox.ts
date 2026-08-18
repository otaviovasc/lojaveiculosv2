import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAccountSession } from "../account/accountSession";
import { useRemoteSearch } from "../../lib/useRemoteSearch";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import {
  buildStorefrontUrl,
  isConnectedConnection,
  readConversationStartCapability,
  resolveCrmInboxConnectionSelection,
} from "./crmWhatsappConnectionSelection";
import { readCrmWhatsappCapabilities } from "./crmWhatsappPermissions";
import {
  mergeSessionsFromServer,
  readSessionRevision,
} from "./crmWhatsappModel";
import {
  asError,
  createConnectionQuery,
  loadDeepLinkedSession,
  readInitialSessionId,
} from "./crmWhatsappHookSupport";
import { useCrmWhatsappMessages } from "./useCrmWhatsappMessages";
import { useCrmWhatsappConnections } from "./useCrmWhatsappConnections";
import { useCrmWhatsappAssignableMembers } from "./useCrmWhatsappAssignableMembers";
import { useCrmWhatsappQuickMessages } from "./useCrmWhatsappQuickMessages";
import { useCrmWhatsappRealtime } from "./useCrmWhatsappRealtime";
import { useCrmWhatsappSessionActions } from "./useCrmWhatsappSessionActions";
import { useCrmWhatsappBulkSelection } from "./useCrmWhatsappBulkSelection";
import { useCrmWhatsappSessionCounts } from "./useCrmWhatsappSessionCounts";
import { useCrmWhatsappStartConversation } from "./useCrmWhatsappStartConversation";
import { useCrmWhatsappScheduledMessages } from "./useCrmWhatsappScheduledMessages";
import { useCrmWhatsappTags } from "./useCrmWhatsappTags";
import { useCrmWhatsappVehicleInventory } from "./useCrmWhatsappVehicleInventory";
import { useCrmWhatsappInboxLifecycle } from "./useCrmWhatsappInboxLifecycle";
import { useCrmRoutingPolicy } from "./useCrmRoutingPolicy";
import { readCrmWhatsappSendReadiness } from "./crmWhatsappProviderCapabilities";
import { useCrmWhatsappQueueAccess } from "./useCrmWhatsappQueueAccess";
import type {
  CrmWhatsappRealtimeStatus,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
  CrmWhatsappHumanAttendanceState,
  CrmWhatsappStatus,
} from "./crmWhatsappTypes";

export function useCrmWhatsappInbox(api: CrmWhatsappApi) {
  const accountSession = useOptionalAccountSession();
  const initialSessionId = readInitialSessionId();
  const [activeSessionId, setActiveSessionId] =
    useState<CrmWhatsappSessionId | null>(initialSessionId);
  const [initialSessionResolved, setInitialSessionResolved] = useState(
    initialSessionId === null,
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [connectionFilterId, setConnectionFilterId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const remoteSearch = useRemoteSearch(search);
  const [statusFilter, setStatusFilter] = useState<CrmWhatsappStatus | "">("");
  const [humanAttendanceFilter, setHumanAttendanceFilter] = useState<
    CrmWhatsappHumanAttendanceState | ""
  >("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<CrmWhatsappRealtimeStatus>("offline");
  const [sessions, setSessions] = useState<CrmWhatsappSession[]>([]);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const currentUserId = accountSession?.user.id ?? null;
  const permissions = useMemo(
    () => readCrmWhatsappCapabilities(accountSession),
    [accountSession],
  );
  const queueAccess = useCrmWhatsappQueueAccess({
    canAssign: permissions.canAssign,
    currentUserId,
    sessions,
  });
  const {
    otherAssigneeId,
    quickFilter,
    setOtherAssigneeId,
    setQuickFilter,
    visibleSessions,
  } = queueAccess;
  const assignmentState = useCrmWhatsappAssignableMembers(accountSession);
  const listVehicles = useCrmWhatsappVehicleInventory();
  const activeSession = useMemo(
    () =>
      visibleSessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, visibleSessions],
  );
  const connections = useCrmWhatsappConnections(api);
  const routing = useCrmRoutingPolicy(api, permissions.canList);
  const connectionSelection = useMemo(
    () =>
      resolveCrmInboxConnectionSelection({
        activeSessionConnectionId: activeSession?.connection?.id
          ? String(activeSession.connection.id)
          : null,
        connectionFilterId,
        connections: connections.connections,
        hasActiveSession: activeSession !== null,
        routingPolicy: routing.policy,
      }),
    [
      activeSession,
      connectionFilterId,
      connections.connections,
      routing.policy,
    ],
  );
  const connectionId = connectionSelection.viewConnectionId;
  const operationalConnectionId = connectionSelection.operationalConnectionId;
  useEffect(() => {
    if (
      connectionFilterId &&
      !connections.connections.some(
        (connection) =>
          String(connection.id) === connectionFilterId &&
          isConnectedConnection(connection),
      )
    ) {
      setConnectionFilterId(null);
    }
  }, [connectionFilterId, connections.connections]);
  const activeConnection = useMemo(
    () =>
      connections.connections.find(
        (connection) => String(connection.id) === String(connectionId),
      ) ?? null,
    [connectionId, connections.connections],
  );
  const activeSessionConnection = useMemo(
    () =>
      activeSession?.connection?.id
        ? (connections.connections.find(
            (connection) =>
              String(connection.id) === String(activeSession.connection?.id),
          ) ?? null)
        : null,
    [activeSession, connections.connections],
  );
  const sessionListConnectionId =
    initialSessionId && activeSession?.id === initialSessionId
      ? operationalConnectionId
      : connectionId;
  const conversationStartCapability = useMemo(
    () => readConversationStartCapability(activeConnection),
    [activeConnection],
  );
  const sendReadiness = useMemo(
    () =>
      readCrmWhatsappSendReadiness(activeSessionConnection ?? activeConnection),
    [activeConnection, activeSessionConnection],
  );
  const catalogUrl = useMemo(
    () => buildStorefrontUrl(accountSession?.defaultStore?.storeSlug),
    [accountSession?.defaultStore?.storeSlug],
  );
  const markingReadRef = useRef(new Set<CrmWhatsappSessionId>());
  const manualUnreadSessionIdsRef = useRef(new Set<CrmWhatsappSessionId>());
  const previousActiveSessionIdRef = useRef<CrmWhatsappSessionId | null>(
    activeSessionId,
  );
  const sessionRequestGenerationRef = useRef(0);
  const sessionRevisionsRef = useRef(
    new Map<CrmWhatsappSessionId, number | null>(),
  );
  const searchRef = useRef(remoteSearch ?? "");
  searchRef.current = remoteSearch ?? "";
  const tagState = useCrmWhatsappTags({
    api,
    canRead: permissions.canRead,
    connectionId,
    connectionsError: connections.error,
    setError,
  });
  const { selectedTagIds } = tagState;
  const canAccessSessionSnapshot = useCallback(
    (session: CrmWhatsappSession) =>
      permissions.canAssign ||
      Boolean(
        currentUserId && session.assignedUserId === String(currentUserId),
      ),
    [currentUserId, permissions.canAssign],
  );
  const mergeSessions = useCallback(
    (
      nextSessions: CrmWhatsappSession[],
      options?: {
        preserveLocalOnly?: boolean;
        pruneLocalOnly?: (session: CrmWhatsappSession) => boolean;
        snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
      },
    ) =>
      setSessions((current) => {
        const merged = mergeSessionsFromServer(current, nextSessions, {
          ...options,
          ...(options?.snapshotKind === "reconciled" && !options.pruneLocalOnly
            ? {
                pruneLocalOnly: (session: CrmWhatsappSession) =>
                  !canAccessSessionSnapshot(session),
              }
            : {}),
        });
        sessionRevisionsRef.current.clear();
        merged.forEach((session) => {
          sessionRevisionsRef.current.set(
            session.id,
            readSessionRevision(session),
          );
        });
        return merged;
      }),
    [canAccessSessionSnapshot],
  );
  const canMergeSessionSnapshot = useCallback((session: CrmWhatsappSession) => {
    const currentRevision = sessionRevisionsRef.current.get(session.id);
    if (currentRevision === undefined) return true;
    const incomingRevision = readSessionRevision(session);
    if (currentRevision === null) return incomingRevision === null;
    return incomingRevision !== null && incomingRevision >= currentRevision;
  }, []);
  const canLoadMessages = Boolean(
    operationalConnectionId && activeSession && permissions.canRead,
  );
  const canSendMessages = Boolean(
    operationalConnectionId && permissions.canSend && sendReadiness.canSend,
  );
  const messageState = useCrmWhatsappMessages({
    activeSession,
    activeSessionId,
    api,
    canLoadMessages,
    canSendMessages,
    mergeSessions,
    setError,
  });
  const {
    evictSessionMessages,
    mergeRealtimeMessage,
    updateRealtimeMessageStatus,
  } = messageState;
  const removeSession = useCallback(
    (sessionId: CrmWhatsappSessionId) => {
      evictSessionMessages(sessionId);
      sessionRevisionsRef.current.delete(sessionId);
      manualUnreadSessionIdsRef.current.delete(sessionId);
      setSessions((current) =>
        current.filter((session) => session.id !== sessionId),
      );
      setActiveSessionId((current) => (current === sessionId ? null : current));
    },
    [evictSessionMessages],
  );
  const { refreshSessionCounts, sessionCounts } = useCrmWhatsappSessionCounts({
    api,
    canList: permissions.canList,
    connectionId,
    humanAttendanceFilter,
    quickFilter,
    searchRef,
    selectedTagIds,
    statusFilter,
    unreadOnly,
  });

  useEffect(() => {
    if (initialSessionResolved || !initialSessionId || !permissions.canList) {
      return;
    }
    let active = true;
    setIsLoadingSessions(true);
    void loadDeepLinkedSession(api, initialSessionId)
      .then((deepLinked) => {
        if (!active) return;
        if (deepLinked) {
          mergeSessions([deepLinked], { snapshotKind: "reconciled" });
          setActiveSessionId(deepLinked.id);
        }
      })
      .catch((caught) => {
        if (active) setError(asError(caught));
      })
      .finally(() => {
        if (active) setInitialSessionResolved(true);
      });
    return () => {
      active = false;
    };
  }, [
    api,
    initialSessionId,
    initialSessionResolved,
    mergeSessions,
    permissions.canList,
  ]);

  const refreshSessions = useCallback(
    async (
      options: {
        preserveLocalOnly?: boolean;
        snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
      } = {},
    ) => {
      if (!sessionListConnectionId || !permissions.canList) return;
      const requestGeneration = ++sessionRequestGenerationRef.current;
      const connectionQuery = createConnectionQuery(sessionListConnectionId);
      const nextSessions = await api.listSessions({
        ...connectionQuery,
        ...(quickFilter === "others" && otherAssigneeId
          ? { assigneeId: otherAssigneeId }
          : {}),
        filter: quickFilter,
        ...(humanAttendanceFilter
          ? { humanAttendanceState: humanAttendanceFilter }
          : {}),
        limit: 40,
        offset: 0,
        ...(searchRef.current ? { search: searchRef.current } : {}),
        ...(selectedTagIds.length ? { tagIds: selectedTagIds } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(unreadOnly ? { unreadOnly } : {}),
      });
      let resolved = nextSessions;
      let authorizedSessionIds: Set<CrmWhatsappSessionId> | null = null;
      let isCompleteAuthorizationSnapshot = false;
      if (options.snapshotKind === "reconciled" && !permissions.canAssign) {
        const hasNarrowingFilter = Boolean(
          humanAttendanceFilter ||
          searchRef.current ||
          selectedTagIds.length ||
          statusFilter ||
          unreadOnly,
        );
        const authorizationSessions = hasNarrowingFilter
          ? await api.listSessions({
              ...connectionQuery,
              filter: "mine",
              limit: 40,
              offset: 0,
            })
          : nextSessions;
        if (requestGeneration !== sessionRequestGenerationRef.current) return;
        authorizedSessionIds = new Set(
          authorizationSessions.map((session) => session.id),
        );
        isCompleteAuthorizationSnapshot = authorizationSessions.length < 40;
      }
      if (requestGeneration !== sessionRequestGenerationRef.current) return;
      if (
        initialSessionId &&
        !nextSessions.some((session) => session.id === initialSessionId)
      ) {
        const deepLinked = await loadDeepLinkedSession(api, initialSessionId);
        if (requestGeneration !== sessionRequestGenerationRef.current) return;
        resolved = deepLinked ? [deepLinked, ...nextSessions] : nextSessions;
      }
      const shouldPruneLocalSession =
        options.snapshotKind === "reconciled" && authorizedSessionIds
          ? (session: CrmWhatsappSession) =>
              !canAccessSessionSnapshot(session) ||
              (isCompleteAuthorizationSnapshot &&
                session.connection?.id === sessionListConnectionId &&
                !authorizedSessionIds.has(session.id))
          : null;
      if (shouldPruneLocalSession) {
        sessionsRef.current
          .filter(shouldPruneLocalSession)
          .forEach((session) => removeSession(session.id));
      }
      mergeSessions(resolved, {
        ...options,
        ...(shouldPruneLocalSession
          ? { pruneLocalOnly: shouldPruneLocalSession }
          : {}),
      });
      setActiveSessionId((current) =>
        current && resolved.some((session) => session.id === current)
          ? current
          : isCompleteAuthorizationSnapshot &&
              current &&
              !authorizedSessionIds?.has(current)
            ? null
            : options.preserveLocalOnly && current
              ? current
              : (resolved[0]?.id ?? null),
      );
      void refreshSessionCounts().catch((caught) => setError(asError(caught)));
    },
    [
      api,
      canAccessSessionSnapshot,
      initialSessionId,
      mergeSessions,
      sessionListConnectionId,
      humanAttendanceFilter,
      permissions.canList,
      otherAssigneeId,
      quickFilter,
      refreshSessionCounts,
      removeSession,
      selectedTagIds,
      statusFilter,
      unreadOnly,
    ],
  );

  const patchSession = useCallback((nextSession: CrmWhatsappSession) => {
    setSessions((current) =>
      mergeSessionsFromServer(current, [nextSession], {
        preserveLocalOnly: true,
        snapshotKind: "mutation",
      }),
    );
  }, []);
  const sessionActions = useCrmWhatsappSessionActions({
    api,
    patchSession,
    refreshSessions,
    sessions,
    setError,
  });
  const quickMessageState = useCrmWhatsappQuickMessages(api, setError);
  const bulkSelection = useCrmWhatsappBulkSelection(
    visibleSessions,
    sessionActions.actions,
  );

  const markSessionReadOnce = useCallback(
    (session: CrmWhatsappSession) => {
      if (
        !permissions.canRead ||
        !session.unreadCount ||
        markingReadRef.current.has(session.id)
      )
        return;
      markingReadRef.current.add(session.id);
      void sessionActions.actions
        .markSessionRead(session.id, { silent: true })
        .finally(() => {
          markingReadRef.current.delete(session.id);
        });
    },
    [permissions.canRead, sessionActions.actions],
  );

  const selectSession = useCallback((sessionId: CrmWhatsappSessionId) => {
    const previous = previousActiveSessionIdRef.current;
    if (previous && previous !== sessionId) {
      manualUnreadSessionIdsRef.current.delete(previous);
    }
    previousActiveSessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
  }, []);
  const conversationState = useCrmWhatsappStartConversation({
    api,
    canSend: canSendMessages && conversationStartCapability.canStart,
    connectionId,
    mergeSessions,
    setActiveSessionId: selectSession,
    setError,
  });

  const scheduledMessages = useCrmWhatsappScheduledMessages(api, setError);

  const markVisibleInboundRead = useCallback(
    (session: CrmWhatsappSession) => {
      if (!manualUnreadSessionIdsRef.current.has(session.id)) {
        markSessionReadOnce(session);
      }
    },
    [markSessionReadOnce],
  );

  useCrmWhatsappRealtime({
    activeSessionId,
    api,
    canAccessSessionSnapshot,
    connectionId: operationalConnectionId,
    connectionsError: connections.error ?? routing.error,
    canMergeSessionSnapshot,
    mergeRealtimeMessage,
    mergeSessions,
    onStatus: setRealtimeStatus,
    onVisibleInboundMessage: markVisibleInboundRead,
    refreshConnections: connections.refreshConnections,
    refreshSessionCounts,
    refreshSessions,
    removeSession,
    updateRealtimeMessageStatus,
  });

  useCrmWhatsappInboxLifecycle({
    activeSession,
    asError,
    connectionId: initialSessionResolved ? sessionListConnectionId : null,
    connections,
    hasLoadedActiveMessages: messageState.hasLoadedActiveMessages,
    manualUnreadSessionIdsRef,
    markSessionReadOnce,
    permissions,
    refreshSessions,
    search: remoteSearch,
    setError,
    setSessions,
    setIsLoadingSessions,
  });

  return {
    activeSession,
    activeSessionId,
    assignableMembers: assignmentState.assignableMembers,
    availableTags: tagState.availableTags,
    availableConnectionProviders: connections.availableProviders,
    canAssignSessions: assignmentState.canAssignSessions,
    canStartConversation:
      canSendMessages && conversationStartCapability.canStart,
    canSendText: canSendMessages,
    activeConnection,
    activeSessionConnection,
    catalogUrl,
    clearSelectedSessions: bulkSelection.clearSelectedSessions,
    connectionFilterId,
    connectionId,
    connectionError: connections.error,
    connectionAllowance: connections.allowance,
    connectionIsLoading: connections.isLoading,
    connections: connections.connections,
    createConnection: connections.createConnection,
    authorizeComposioConnection: connections.authorizeComposio,
    completeComposioConnection: connections.completeComposio,
    configureZapiWebhooks: connections.configureZapiWebhooks,
    disconnectZapiConnection: connections.disconnectZapiConnection,
    refreshConnections: connections.refreshConnections,
    refreshRoutingPolicy: routing.refresh,
    requestZapiPairingCode: connections.requestZapiPairingCode,
    requestZapiPairingQr: connections.requestZapiPairingQr,
    requestZapiAddon: connections.requestZapiAddon,
    refreshZapiConnectionStatus: connections.refreshZapiConnectionStatus,
    selectComposioConnectionSender: connections.selectComposioSender,
    setConnectionPaused: connections.setConnectionPaused,
    createTag: tagState.createTag,
    createQuickMessage: quickMessageState.createQuickMessage,
    createScheduledMessage: scheduledMessages.createScheduledMessage,
    currentUserId,
    deleteMessage: messageState.deleteMessage,
    deleteQuickMessage: quickMessageState.deleteQuickMessage,
    deleteTag: tagState.deleteTag,
    error: error ?? connections.error ?? routing.error,
    hasConnection: Boolean(connectionId),
    hasRetryableSessionAction: sessionActions.hasRetryableSessionAction,
    isLoading: connections.isLoading || routing.isLoading || isLoadingSessions,
    humanAttendanceFilter,
    isLoadingMessages: messageState.isLoadingMessages,
    isMutatingSession: sessionActions.isMutatingSession,
    isSessionActionPending: sessionActions.isSessionActionPending,
    isConcludingSession: sessionActions.isConcludingSession,
    isSending: messageState.isSending,
    isStartingConversation: conversationState.isStartingConversation,
    realtimeStatus,
    cancelScheduledMessage: scheduledMessages.cancelScheduledMessage,
    listCatalogProducts: messageState.listCatalogProducts,
    listScheduledMessages: scheduledMessages.listScheduledMessages,
    listVehicles,
    messages: messageState.messages,
    otherAssigneeId,
    permissions,
    processDueScheduledMessages: scheduledMessages.processDueScheduledMessages,
    quickFilter,
    quickMessages: quickMessageState.quickMessages,
    retryLastSessionAction: sessionActions.retryLastSessionAction,
    refreshSessions,
    refreshTags: tagState.refreshTags,
    reorderTags: tagState.reorderTags,
    removeReaction: messageState.removeReaction,
    search,
    selectAllVisibleSessions: bulkSelection.selectAllVisibleSessions,
    selectedSessionIds: bulkSelection.selectedSessionIds,
    selectedSessions: bulkSelection.selectedSessions,
    selectedTagIds,
    scheduledMessagesError: scheduledMessages.error,
    sendCatalog: messageState.sendCatalog,
    sendCatalogProduct: messageState.sendCatalogProduct,
    sendLocation: messageState.sendLocation,
    sendMedia: messageState.sendMedia,
    sendQuickMessage: messageState.sendQuickMessage,
    sendReaction: messageState.sendReaction,
    sendText: messageState.sendText,
    sendVehicle: messageState.sendVehicle,
    sessionCounts,
    sessions: visibleSessions,
    setActiveSessionId: selectSession,
    setConnectionFilterId,
    setHumanAttendanceFilter,
    setOtherAssigneeId,
    setQuickFilter,
    setSearch,
    setStatusFilter,
    setUnreadOnly,
    statusFilter,
    storeLocationName: accountSession?.defaultStore?.storeName ?? "Loja",
    startConversation: conversationState.startConversation,
    startConversationProvider: conversationStartCapability.provider,
    startConversationUnavailableReason:
      conversationStartCapability.unavailableReason ?? sendReadiness.reason,
    sendUnavailableReason: sendReadiness.reason,
    toggleSelectedSession: bulkSelection.toggleSelectedSession,
    toggleTagFilter: tagState.toggleTagFilter,
    unreadOnly,
    updateQuickMessage: quickMessageState.updateQuickMessage,
    updateTag: tagState.updateTag,
    zapiAddonContract: connections.zapiAddonContract,
    actions: {
      ...sessionActions.actions,
      ...bulkSelection.actions,
      markSessionUnread: (sessionId: CrmWhatsappSessionId) => {
        manualUnreadSessionIdsRef.current.add(sessionId);
        return sessionActions.actions.markSessionUnread(sessionId);
      },
    },
  };
}
