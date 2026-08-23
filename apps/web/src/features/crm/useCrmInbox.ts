import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAccountSession } from "../account/accountSession";
import { readSessionActiveStore } from "../account/sessionPermissions";
import { useRemoteSearch } from "../../lib/useRemoteSearch";
import type { CrmConversationApi } from "./crmConversationApi";
import {
  buildStorefrontUrl,
  isConnectedConnection,
  readConversationStartCapability,
  resolveCrmInboxConnectionSelection,
} from "./crmConnectionSelection";
import { readCrmCapabilities } from "./crmPermissions";
import {
  mergeCyclesFromServer,
  readCycleRevision,
} from "./crmConversationModel";
import {
  asError,
  createConnectionQuery,
  loadDeepLinkedCycle,
  readInitialCycleId,
} from "./crmConversationHookSupport";
import { useCrmMessages } from "./useCrmMessages";
import { useCrmConnections } from "./useCrmConnections";
import { useCrmAssignableMembers } from "./useCrmAssignableMembers";
import { useCrmQuickMessages } from "./useCrmQuickMessages";
import { useCrmRealtime } from "./useCrmRealtime";
import { useCrmConversationCycleActions } from "./useCrmConversationCycleActions";
import { useCrmBulkSelection } from "./useCrmBulkSelection";
import { useCrmConversationCycleCounts } from "./useCrmConversationCycleCounts";
import { useCrmStartConversation } from "./useCrmStartConversation";
import { useCrmScheduledMessages } from "./useCrmScheduledMessages";
import { useCrmTags } from "./useCrmTags";
import { useCrmVehicleInventory } from "./useCrmVehicleInventory";
import { useCrmInboxLifecycle } from "./useCrmInboxLifecycle";
import { useCrmRoutingPolicy } from "./useCrmRoutingPolicy";
import { readCrmSendReadiness } from "./crmProviderCapabilities";
import { useCrmQueueAccess } from "./useCrmQueueAccess";
import type {
  CrmRealtimeStatus,
  CrmConversationCycle,
  CrmConversationCycleId,
  CrmHumanAttendanceState,
  CrmConversationCycleStatus,
} from "./crmConversationTypes";

const CRM_SESSION_PAGE_SIZE = 40;

export function useCrmInbox(
  api: CrmConversationApi,
  routedCycleId: CrmConversationCycleId | null = readInitialCycleId(),
) {
  const accountSession = useOptionalAccountSession();
  const initialCycleId = routedCycleId;
  const [activeCycleId, setActiveCycleId] =
    useState<CrmConversationCycleId | null>(initialCycleId);
  const [initialSessionResolved, setInitialSessionResolved] = useState(
    initialCycleId === null,
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);
  const loadedSessionOffsetRef = useRef(0);
  const [connectionFilterId, setConnectionFilterId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const remoteSearch = useRemoteSearch(search);
  const [statusFilter, setStatusFilter] = useState<
    CrmConversationCycleStatus | ""
  >("");
  const [humanAttendanceFilter, setHumanAttendanceFilter] = useState<
    CrmHumanAttendanceState | ""
  >("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<CrmRealtimeStatus>("offline");
  const [conversationCycles, setSessions] = useState<CrmConversationCycle[]>(
    [],
  );
  const sessionsRef = useRef(conversationCycles);
  sessionsRef.current = conversationCycles;
  const currentUserId = accountSession?.user.id ?? null;
  const activeStore = readSessionActiveStore(accountSession);
  const permissions = useMemo(
    () => readCrmCapabilities(accountSession),
    [accountSession, activeStore?.storeId],
  );
  const queueAccess = useCrmQueueAccess({
    canAssign: permissions.canAssign,
    currentUserId,
    conversationCycles,
  });
  const {
    otherAssigneeId,
    quickFilter,
    setOtherAssigneeId,
    setQuickFilter,
    visibleSessions,
  } = queueAccess;
  const assignmentState = useCrmAssignableMembers(accountSession);
  const listVehicles = useCrmVehicleInventory();
  const activeSession = useMemo(
    () => visibleSessions.find((cycle) => cycle.id === activeCycleId) ?? null,
    [activeCycleId, visibleSessions],
  );
  const connections = useCrmConnections(api);
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
    initialCycleId && activeSession?.id === initialCycleId
      ? operationalConnectionId
      : connectionId;
  const conversationStartCapability = useMemo(
    () => readConversationStartCapability(activeConnection),
    [activeConnection],
  );
  const sendReadiness = useMemo(
    () => readCrmSendReadiness(activeSessionConnection ?? activeConnection),
    [activeConnection, activeSessionConnection],
  );
  const catalogUrl = useMemo(
    () => buildStorefrontUrl(activeStore?.storeSlug),
    [activeStore?.storeSlug],
  );
  const markingReadRef = useRef(new Set<CrmConversationCycleId>());
  const manualUnreadCycleIdsRef = useRef(new Set<CrmConversationCycleId>());
  const previousActiveCycleIdRef = useRef<CrmConversationCycleId | null>(
    activeCycleId,
  );
  const sessionRequestGenerationRef = useRef(0);
  const cycleRevisionsRef = useRef(
    new Map<CrmConversationCycleId, number | null>(),
  );
  const searchRef = useRef(remoteSearch ?? "");
  searchRef.current = remoteSearch ?? "";
  const tagState = useCrmTags({
    api,
    canRead: permissions.canRead,
    connectionId,
    connectionsError: connections.error,
    setError,
  });
  const { selectedTagIds } = tagState;
  const canAccessSessionSnapshot = useCallback(
    (cycle: CrmConversationCycle) =>
      permissions.canAssign ||
      Boolean(currentUserId && cycle.assignedUserId === String(currentUserId)),
    [currentUserId, permissions.canAssign],
  );
  const mergeCycles = useCallback(
    (
      nextSessions: CrmConversationCycle[],
      options?: {
        preserveLocalOnly?: boolean;
        pruneLocalOnly?: (cycle: CrmConversationCycle) => boolean;
        snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
      },
    ) =>
      setSessions((current) => {
        const merged = mergeCyclesFromServer(current, nextSessions, {
          ...options,
          ...(options?.snapshotKind === "reconciled" && !options.pruneLocalOnly
            ? {
                pruneLocalOnly: (cycle: CrmConversationCycle) =>
                  !canAccessSessionSnapshot(cycle),
              }
            : {}),
        });
        cycleRevisionsRef.current.clear();
        merged.forEach((cycle) => {
          cycleRevisionsRef.current.set(cycle.id, readCycleRevision(cycle));
        });
        return merged;
      }),
    [canAccessSessionSnapshot],
  );
  const canMergeSessionSnapshot = useCallback((cycle: CrmConversationCycle) => {
    const currentRevision = cycleRevisionsRef.current.get(cycle.id);
    if (currentRevision === undefined) return true;
    const incomingRevision = readCycleRevision(cycle);
    if (currentRevision === null) return incomingRevision === null;
    return incomingRevision !== null && incomingRevision >= currentRevision;
  }, []);
  const canLoadMessages = Boolean(
    operationalConnectionId && activeSession && permissions.canRead,
  );
  const canSendMessages = Boolean(
    operationalConnectionId && permissions.canSend && sendReadiness.canSend,
  );
  const messageState = useCrmMessages({
    activeSession,
    activeCycleId,
    api,
    canLoadMessages,
    canSendMessages,
    mergeCycles,
    setError,
  });
  const {
    evictSessionMessages,
    mergeRealtimeMessage,
    updateRealtimeMessageStatus,
  } = messageState;
  const removeSession = useCallback(
    (cycleId: CrmConversationCycleId) => {
      evictSessionMessages(cycleId);
      cycleRevisionsRef.current.delete(cycleId);
      manualUnreadCycleIdsRef.current.delete(cycleId);
      setSessions((current) => current.filter((cycle) => cycle.id !== cycleId));
      setActiveCycleId((current) => (current === cycleId ? null : current));
    },
    [evictSessionMessages],
  );
  const { refreshSessionCounts, conversationCycleCounts } =
    useCrmConversationCycleCounts({
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

  const createSessionQuery = useCallback(
    (offset: number) => ({
      ...createConnectionQuery(sessionListConnectionId!),
      ...(quickFilter === "others" && otherAssigneeId
        ? { assigneeId: otherAssigneeId }
        : {}),
      filter: quickFilter,
      ...(humanAttendanceFilter
        ? { humanAttendanceState: humanAttendanceFilter }
        : {}),
      limit: CRM_SESSION_PAGE_SIZE,
      offset,
      ...(searchRef.current ? { search: searchRef.current } : {}),
      ...(selectedTagIds.length ? { tagIds: selectedTagIds } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(unreadOnly ? { unreadOnly } : {}),
    }),
    [
      humanAttendanceFilter,
      otherAssigneeId,
      quickFilter,
      selectedTagIds,
      sessionListConnectionId,
      statusFilter,
      unreadOnly,
    ],
  );

  useEffect(() => {
    sessionRequestGenerationRef.current += 1;
    const alreadyLoaded = Boolean(
      initialCycleId &&
      sessionsRef.current.some((cycle) => cycle.id === initialCycleId),
    );
    setActiveCycleId(initialCycleId);
    setInitialSessionResolved(initialCycleId === null || alreadyLoaded);
    if (initialCycleId && !alreadyLoaded) setIsLoadingSessions(true);
    if (initialCycleId && alreadyLoaded) setIsLoadingSessions(false);
  }, [initialCycleId]);

  useEffect(() => {
    if (initialSessionResolved || !initialCycleId || !permissions.canList) {
      return;
    }
    let active = true;
    setIsLoadingSessions(true);
    void loadDeepLinkedCycle(api, initialCycleId)
      .then((deepLinked) => {
        if (!active) return;
        if (deepLinked) {
          mergeCycles([deepLinked], {
            preserveLocalOnly: true,
            snapshotKind: "reconciled",
          });
          setActiveCycleId(deepLinked.id);
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
    initialCycleId,
    initialSessionResolved,
    mergeCycles,
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
      const nextSessions = await api.listConversationCycles(
        createSessionQuery(0),
      );
      let resolved = nextSessions;
      let authorizedCycleIds: Set<CrmConversationCycleId> | null = null;
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
          ? await api.listConversationCycles({
              ...connectionQuery,
              filter: "mine",
              limit: 40,
              offset: 0,
            })
          : nextSessions;
        if (requestGeneration !== sessionRequestGenerationRef.current) return;
        authorizedCycleIds = new Set(
          authorizationSessions.map((cycle) => cycle.id),
        );
        isCompleteAuthorizationSnapshot = authorizationSessions.length < 40;
      }
      if (requestGeneration !== sessionRequestGenerationRef.current) return;
      if (
        initialCycleId &&
        !nextSessions.some((cycle) => cycle.id === initialCycleId)
      ) {
        const deepLinked = await loadDeepLinkedCycle(api, initialCycleId);
        if (requestGeneration !== sessionRequestGenerationRef.current) return;
        resolved = deepLinked ? [deepLinked, ...nextSessions] : nextSessions;
      }
      const shouldPruneLocalSession =
        options.snapshotKind === "reconciled" && authorizedCycleIds
          ? (cycle: CrmConversationCycle) =>
              !canAccessSessionSnapshot(cycle) ||
              (isCompleteAuthorizationSnapshot &&
                cycle.connection?.id === sessionListConnectionId &&
                !authorizedCycleIds.has(cycle.id))
          : null;
      if (shouldPruneLocalSession) {
        sessionsRef.current
          .filter(shouldPruneLocalSession)
          .forEach((cycle) => removeSession(cycle.id));
      }
      mergeCycles(resolved, {
        ...options,
        ...(shouldPruneLocalSession
          ? { pruneLocalOnly: shouldPruneLocalSession }
          : {}),
      });
      if (!options.preserveLocalOnly) {
        loadedSessionOffsetRef.current = nextSessions.length;
        setHasMoreSessions(nextSessions.length === CRM_SESSION_PAGE_SIZE);
      } else if (loadedSessionOffsetRef.current <= CRM_SESSION_PAGE_SIZE) {
        loadedSessionOffsetRef.current = Math.max(
          loadedSessionOffsetRef.current,
          nextSessions.length,
        );
        setHasMoreSessions(nextSessions.length === CRM_SESSION_PAGE_SIZE);
      }
      setActiveCycleId((current) =>
        current && resolved.some((cycle) => cycle.id === current)
          ? current
          : isCompleteAuthorizationSnapshot &&
              current &&
              !authorizedCycleIds?.has(current)
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
      createSessionQuery,
      initialCycleId,
      mergeCycles,
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

  const loadMoreSessions = useCallback(async () => {
    if (
      !sessionListConnectionId ||
      !permissions.canList ||
      !hasMoreSessions ||
      isLoadingMoreSessions
    ) {
      return;
    }
    const requestGeneration = ++sessionRequestGenerationRef.current;
    setIsLoadingMoreSessions(true);
    try {
      const nextSessions = await api.listConversationCycles(
        createSessionQuery(loadedSessionOffsetRef.current),
      );
      if (requestGeneration !== sessionRequestGenerationRef.current) return;
      loadedSessionOffsetRef.current += nextSessions.length;
      mergeCycles(nextSessions, {
        preserveLocalOnly: true,
        snapshotKind: "poll",
      });
      setHasMoreSessions(nextSessions.length === CRM_SESSION_PAGE_SIZE);
    } catch (caught) {
      if (requestGeneration === sessionRequestGenerationRef.current) {
        setError(asError(caught));
      }
    } finally {
      setIsLoadingMoreSessions(false);
    }
  }, [
    api,
    createSessionQuery,
    hasMoreSessions,
    isLoadingMoreSessions,
    mergeCycles,
    permissions.canList,
    sessionListConnectionId,
  ]);

  const patchSession = useCallback((nextSession: CrmConversationCycle) => {
    setSessions((current) =>
      mergeCyclesFromServer(current, [nextSession], {
        preserveLocalOnly: true,
        snapshotKind: "mutation",
      }),
    );
  }, []);
  const sessionActions = useCrmConversationCycleActions({
    api,
    patchSession,
    refreshSessions,
    conversationCycles,
    setError,
  });
  const quickMessageState = useCrmQuickMessages(api, setError);
  const bulkSelection = useCrmBulkSelection(
    visibleSessions,
    sessionActions.actions,
  );

  const markCycleReadOnce = useCallback(
    (cycle: CrmConversationCycle) => {
      if (
        !permissions.canRead ||
        !cycle.unreadCount ||
        markingReadRef.current.has(cycle.id)
      )
        return;
      markingReadRef.current.add(cycle.id);
      void sessionActions.actions
        .markCycleRead(cycle.id, { silent: true })
        .finally(() => {
          markingReadRef.current.delete(cycle.id);
        });
    },
    [permissions.canRead, sessionActions.actions],
  );

  const selectSession = useCallback((cycleId: CrmConversationCycleId) => {
    const previous = previousActiveCycleIdRef.current;
    if (previous && previous !== cycleId) {
      manualUnreadCycleIdsRef.current.delete(previous);
    }
    previousActiveCycleIdRef.current = cycleId;
    setActiveCycleId(cycleId);
  }, []);
  const conversationState = useCrmStartConversation({
    api,
    canSend: canSendMessages && conversationStartCapability.canStart,
    connectionId,
    mergeCycles,
    setActiveCycleId: selectSession,
    setError,
  });

  const scheduledMessages = useCrmScheduledMessages(api, setError);

  const markVisibleInboundRead = useCallback(
    (cycle: CrmConversationCycle) => {
      if (!manualUnreadCycleIdsRef.current.has(cycle.id)) {
        markCycleReadOnce(cycle);
      }
    },
    [markCycleReadOnce],
  );

  useCrmRealtime({
    activeCycleId,
    api,
    canAccessSessionSnapshot,
    connectionId: operationalConnectionId,
    connectionsError: connections.error ?? routing.error,
    canMergeSessionSnapshot,
    mergeRealtimeMessage,
    mergeCycles,
    onStatus: setRealtimeStatus,
    onVisibleInboundMessage: markVisibleInboundRead,
    refreshConnections: connections.refreshConnections,
    refreshSessionCounts,
    refreshSessions,
    removeSession,
    updateRealtimeMessageStatus,
  });

  useCrmInboxLifecycle({
    activeSession,
    asError,
    connectionId: initialSessionResolved ? sessionListConnectionId : null,
    connections,
    hasLoadedActiveMessages: messageState.hasLoadedActiveMessages,
    manualUnreadCycleIdsRef,
    markCycleReadOnce,
    permissions,
    refreshSessions,
    search: remoteSearch,
    setError,
    setSessions,
    setIsLoadingSessions,
  });

  return {
    activeSession,
    activeCycleId,
    assignableMembers: assignmentState.assignableMembers,
    availableTags: tagState.availableTags,
    availableConnectionSetups: connections.availableSetups,
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
    repairZapiConnectionCredentials:
      connections.repairZapiConnectionCredentials,
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
    hasOlderMessages: messageState.hasOlderMessages,
    hasMoreSessions,
    hasRetryableSessionAction: sessionActions.hasRetryableSessionAction,
    isLoading: connections.isLoading || routing.isLoading || isLoadingSessions,
    humanAttendanceFilter,
    isLoadingMessages: messageState.isLoadingMessages,
    isLoadingOlderMessages: messageState.isLoadingOlderMessages,
    isLoadingMoreSessions,
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
    loadOlderMessages: messageState.loadOlderMessages,
    loadMoreSessions,
    messages: messageState.messages,
    olderMessagesError: messageState.olderMessagesError,
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
    selectedCycleIds: bulkSelection.selectedCycleIds,
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
    conversationCycleCounts,
    conversationCycles: visibleSessions,
    setActiveCycleId: selectSession,
    setConnectionFilterId,
    setHumanAttendanceFilter,
    setOtherAssigneeId,
    setQuickFilter,
    setSearch,
    setStatusFilter,
    setUnreadOnly,
    statusFilter,
    storeLocationName: activeStore?.storeName ?? "Loja",
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
      markCycleUnread: (cycleId: CrmConversationCycleId) => {
        manualUnreadCycleIdsRef.current.add(cycleId);
        return sessionActions.actions.markCycleUnread(cycleId);
      },
    },
  };
}
