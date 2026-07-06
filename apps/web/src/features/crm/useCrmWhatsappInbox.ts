import { useCallback, useMemo, useRef, useState } from "react";
import { useOptionalAccountSession } from "../account/accountSession";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import {
  buildStorefrontUrl,
  findConnectedConnection,
} from "./crmWhatsappConnectionSelection";
import { readCrmWhatsappCapabilities } from "./crmWhatsappPermissions";
import { mergeSessionsFromServer } from "./crmWhatsappModel";
import {
  asError,
  createConnectionQuery,
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
import type {
  CrmWhatsappSession,
  CrmWhatsappSessionFilter,
  CrmWhatsappSessionId,
  CrmWhatsappStatus,
} from "./crmWhatsappTypes";

export function useCrmWhatsappInbox(api: CrmWhatsappApi) {
  const accountSession = useOptionalAccountSession();
  const initialSessionId = readInitialSessionId();
  const [activeSessionId, setActiveSessionId] =
    useState<CrmWhatsappSessionId | null>(initialSessionId);
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [quickFilter, setQuickFilter] =
    useState<CrmWhatsappSessionFilter>("fresh");
  const [connectionFilterId, setConnectionFilterId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CrmWhatsappStatus | "">("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sessions, setSessions] = useState<CrmWhatsappSession[]>([]);
  const currentUserId = accountSession?.user.id ?? null;
  const permissions = useMemo(
    () => readCrmWhatsappCapabilities(accountSession),
    [accountSession],
  );
  const assignmentState = useCrmWhatsappAssignableMembers(accountSession);
  const listVehicles = useCrmWhatsappVehicleInventory();
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const connections = useCrmWhatsappConnections(api);
  const connectionId = useMemo(
    () =>
      connectionFilterId ??
      findConnectedConnection(connections.connections)?.id ??
      null,
    [connectionFilterId, connections.connections],
  );
  const catalogUrl = useMemo(
    () => buildStorefrontUrl(accountSession?.defaultStore?.storeSlug),
    [accountSession?.defaultStore?.storeSlug],
  );
  const autoReadSessionIdsRef = useRef(new Set<CrmWhatsappSessionId>());
  const markingReadRef = useRef(new Set<CrmWhatsappSessionId>());
  const searchRef = useRef(search);
  searchRef.current = search;
  const tagState = useCrmWhatsappTags({
    api,
    canRead: permissions.canRead,
    connectionId,
    connectionsError: connections.error,
    setError,
  });
  const { selectedTagIds } = tagState;
  const mergeSessions = useCallback(
    (
      nextSessions: CrmWhatsappSession[],
      options?: { preserveLocalOnly?: boolean },
    ) =>
      setSessions((current) =>
        mergeSessionsFromServer(current, nextSessions, options),
      ),
    [],
  );
  const canLoadMessages = Boolean(connectionId && permissions.canRead);
  const canSendMessages = Boolean(connectionId && permissions.canSend);
  const messageState = useCrmWhatsappMessages({
    activeSession,
    activeSessionId,
    api,
    canLoadMessages,
    canSendMessages,
    mergeSessions,
    setError,
  });
  const { mergeRealtimeMessage, updateRealtimeMessageStatus } = messageState;
  const { refreshSessionCounts, sessionCounts } = useCrmWhatsappSessionCounts({
    api,
    canList: permissions.canList,
    connectionId,
    quickFilter,
    searchRef,
    selectedTagIds,
    statusFilter,
    unreadOnly,
  });

  const refreshSessions = useCallback(
    async (options: { preserveLocalOnly?: boolean } = {}) => {
      if (!connectionId || !permissions.canList) return;
      const connectionQuery = createConnectionQuery(connectionId);
      const nextSessions = await api.listSessions({
        ...connectionQuery,
        filter: quickFilter,
        limit: 40,
        offset: 0,
        ...(searchRef.current ? { search: searchRef.current } : {}),
        ...(selectedTagIds.length ? { tagIds: selectedTagIds } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(unreadOnly ? { unreadOnly } : {}),
      });
      let resolved = nextSessions;
      if (
        initialSessionId &&
        !nextSessions.some((session) => session.id === initialSessionId)
      ) {
        const deepLinked = await api.listSessions({
          ...connectionQuery,
          limit: 1,
          offset: 0,
          sessionId: initialSessionId,
        });
        resolved = deepLinked[0]
          ? [deepLinked[0], ...nextSessions]
          : nextSessions;
      }
      mergeSessions(resolved, options);
      setActiveSessionId((current) =>
        current && resolved.some((session) => session.id === current)
          ? current
          : options.preserveLocalOnly && current
            ? current
            : (resolved[0]?.id ?? null),
      );
      void refreshSessionCounts().catch((caught) => setError(asError(caught)));
    },
    [
      api,
      initialSessionId,
      mergeSessions,
      connectionId,
      permissions.canList,
      quickFilter,
      refreshSessionCounts,
      selectedTagIds,
      statusFilter,
      unreadOnly,
    ],
  );

  const patchSession = useCallback((nextSession: CrmWhatsappSession) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === nextSession.id
          ? { ...session, ...nextSession }
          : session,
      ),
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
    sessions,
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
      void sessionActions.actions.markSessionRead(session.id).finally(() => {
        markingReadRef.current.delete(session.id);
      });
    },
    [permissions.canRead, sessionActions.actions],
  );

  const selectSession = useCallback(
    (sessionId: CrmWhatsappSessionId) => {
      setActiveSessionId(sessionId);
      const session = sessions.find((item) => item.id === sessionId);
      if (session) markSessionReadOnce(session);
    },
    [markSessionReadOnce, sessions],
  );
  const conversationState = useCrmWhatsappStartConversation({
    api,
    canSend: canSendMessages,
    connectionId,
    mergeSessions,
    setActiveSessionId: selectSession,
    setError,
  });

  const scheduledMessages = useCrmWhatsappScheduledMessages(api, setError);

  useCrmWhatsappRealtime({
    activeSessionId,
    api,
    connectionId,
    connectionsError: connections.error,
    mergeRealtimeMessage,
    mergeSessions,
    refreshConnections: connections.refreshConnections,
    refreshSessions,
    setError,
    updateRealtimeMessageStatus,
  });

  useCrmWhatsappInboxLifecycle({
    activeSession,
    autoReadSessionIdsRef,
    asError,
    connectionId,
    connections,
    markSessionReadOnce,
    permissions,
    refreshSessions,
    search,
    setError,
    setSessions,
    setIsLoadingSessions,
  });

  return {
    activeSession,
    activeSessionId,
    assignableMembers: assignmentState.assignableMembers,
    availableTags: tagState.availableTags,
    canAssignSessions: assignmentState.canAssignSessions,
    canSendText: canSendMessages,
    catalogUrl,
    clearSelectedSessions: bulkSelection.clearSelectedSessions,
    connectionFilterId,
    connectionId,
    connectionError: connections.error,
    connectionIsLoading: connections.isLoading,
    connections: connections.connections,
    refreshConnections: connections.refreshConnections,
    updateConnection: connections.updateConnection,
    createTag: tagState.createTag,
    createQuickMessage: quickMessageState.createQuickMessage,
    createScheduledMessage: scheduledMessages.createScheduledMessage,
    currentUserId,
    deleteMessage: messageState.deleteMessage,
    deleteQuickMessage: quickMessageState.deleteQuickMessage,
    deleteTag: tagState.deleteTag,
    error: error ?? connections.error,
    hasConnection: connections.hasConnectedConnection,
    isLoading: connections.isLoading || isLoadingSessions,
    isLoadingMessages: messageState.isLoadingMessages,
    isMutatingSession: sessionActions.isMutatingSession,
    isSending: messageState.isSending,
    isStartingConversation: conversationState.isStartingConversation,
    cancelScheduledMessage: scheduledMessages.cancelScheduledMessage,
    listCatalogProducts: messageState.listCatalogProducts,
    listScheduledMessages: scheduledMessages.listScheduledMessages,
    listVehicles,
    messages: messageState.messages,
    permissions,
    processDueScheduledMessages: scheduledMessages.processDueScheduledMessages,
    quickFilter,
    quickMessages: quickMessageState.quickMessages,
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
    sessions,
    setActiveSessionId: selectSession,
    setConnectionFilterId,
    setQuickFilter,
    setSearch,
    setStatusFilter,
    setUnreadOnly,
    statusFilter,
    storeLocationName: accountSession?.defaultStore?.storeName ?? "Loja",
    startConversation: conversationState.startConversation,
    toggleSelectedSession: bulkSelection.toggleSelectedSession,
    toggleTagFilter: tagState.toggleTagFilter,
    unreadOnly,
    updateQuickMessage: quickMessageState.updateQuickMessage,
    updateTag: tagState.updateTag,
    actions: { ...sessionActions.actions, ...bulkSelection.actions },
  };
}
