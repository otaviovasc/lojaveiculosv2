import { useCallback, useEffect, useRef, useState } from "react";
import { ChatHeader, MessageComposer } from "./CrmConversationParts";
import { MessageList } from "./CrmMessageParts";
import { CrmQueueToolbar } from "./CrmQueueToolbar";
import { CrmQueueBulkBar } from "./CrmQueueBulkBar";
import { CrmReadOnlyComposer } from "./CrmReadOnlyComposer";
import { CrmConversationCycleDetailsPanel } from "./CrmConversationCycleDetailsPanel";
import {
  CrmEmptyConversationPane,
  CrmQueueListPane,
  CrmWorkspaceOverlays,
  useCrmWorkspaceShellEvents,
} from "./CrmConversationWorkspaceParts";
import type { useCrmInbox } from "./useCrmInbox";
import type {
  CrmConversationCycleId,
  CrmMessage,
  CrmProviderConnection,
} from "./crmConversationTypes";
import type { CrmScope } from "./CrmScopedNav";
import type { MessageComposerHandle } from "./CrmComposer";
import { readCrmConnectionCapabilities } from "./crmProviderCapabilities";
import { isUiDemoConnection } from "./crmConnectionSelection";

export function CrmConversationWorkspace({
  inbox,
  onCycleChange,
  onScopeChange,
  routeCycleId,
}: {
  inbox: ReturnType<typeof useCrmInbox>;
  onCycleChange: (cycleId: CrmConversationCycleId | null) => void;
  onScopeChange: (scope: CrmScope) => void;
  routeCycleId: CrmConversationCycleId | null;
}) {
  const activeSession = inbox.activeSession;
  const shellRef = useRef<HTMLElement>(null);
  const composerRef = useRef<MessageComposerHandle>(null);
  const [mobilePane, setMobilePane] = useState<"chat" | "context" | "list">(
    () => (routeCycleId ? "chat" : "list"),
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scheduleMessageOpen, setScheduleMessageOpen] = useState(false);
  const [scheduleVisitOpen, setScheduleVisitOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationDraft, setNewConversationDraft] = useState<{
    buyerName?: string;
    phone?: string;
  } | null>(null);
  const [conclusionOpen, setConclusionOpen] = useState(false);
  const [deleteCycleId, setDeleteCycleId] =
    useState<CrmConversationCycleId | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<CrmMessage | null>(null);
  const selectedCount = inbox.selectedSessions.length;
  const showSelectionMode = selectionMode || selectedCount > 0;
  const activeSessionConnection = inbox.activeSession?.connection?.id
    ? (inbox.connections.find(
        (connection) =>
          String(connection.id) === String(inbox.activeSession?.connection?.id),
      ) ??
      (inbox.activeSessionConnection as CrmProviderConnection | null) ??
      null)
    : ((inbox.activeSessionConnection as CrmProviderConnection | null) ?? null);
  const activeChatConnection =
    activeSessionConnection ??
    inbox.activeConnection ??
    (inbox.activeSession?.connection as CrmProviderConnection | undefined) ??
    null;
  const isDemoActive = isUiDemoConnection(activeChatConnection);
  const isDemoView = isUiDemoConnection(inbox.activeConnection);
  const providerCapabilities = readCrmConnectionCapabilities(
    activeSessionConnection,
  );

  useEffect(() => {
    const handleStartConversation = (event: Event) => {
      const customEvent = event as CustomEvent<{
        buyerName?: string;
        phone?: string;
      }>;
      if (customEvent.detail) {
        setNewConversationDraft(customEvent.detail);
        setNewConversationOpen(true);
      }
    };
    window.addEventListener("crm:start-conversation", handleStartConversation);
    return () => {
      window.removeEventListener(
        "crm:start-conversation",
        handleStartConversation,
      );
    };
  }, []);

  useEffect(() => {
    setReplyToMessage(null);
    setDetailsOpen(false);
    setConclusionOpen(false);
    setScheduleMessageOpen(false);
    setScheduleVisitOpen(false);
  }, [inbox.activeCycleId, inbox.connectionFilterId]);

  useEffect(() => {
    if (!detailsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        setDetailsOpen(false);
        focusPane("chat");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailsOpen]);

  useCrmWorkspaceShellEvents(shellRef, inbox);

  useEffect(() => {
    setMobilePane(routeCycleId ? "chat" : "list");
  }, [routeCycleId]);

  useEffect(() => {
    if (!activeSession || !inbox.canSendText || detailsOpen) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const activeElement = document.activeElement as HTMLElement | null;
      const focusMayMove =
        !activeElement ||
        activeElement === document.body ||
        activeElement === shellRef.current ||
        Boolean(activeElement.closest(".crm-list"));
      if (focusMayMove) composerRef.current?.focusInput();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSession?.id, detailsOpen, inbox.canSendText, routeCycleId]);

  const focusPane = useCallback(
    (pane: "chat" | "context" | "list") => {
      setMobilePane(pane);
      window.requestAnimationFrame(() => {
        if (
          pane === "chat" &&
          activeSession &&
          inbox.canSendText &&
          !detailsOpen
        ) {
          composerRef.current?.focusInput();
          return;
        }
        const selector =
          pane === "list"
            ? ".crm-list"
            : pane === "chat"
              ? ".crm-chat"
              : ".crm-details-panel";
        shellRef.current
          ?.querySelector<HTMLElement>(selector)
          ?.focus({ preventScroll: true });
      });
    },
    [activeSession, detailsOpen, inbox.canSendText],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || !["1", "2"].includes(event.key)) return;
      if (shellRef.current?.closest("[hidden], .hidden")) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      focusPane(event.key === "1" ? "list" : "chat");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusPane]);

  return (
    <section
      aria-keyshortcuts="Alt+1 Alt+2"
      className="crm-shell"
      data-details-open={detailsOpen ? "true" : "false"}
      data-mobile-pane={mobilePane}
      ref={shellRef}
    >
      <aside className="crm-list" aria-label="Fila de conversas" tabIndex={-1}>
        <CrmQueueToolbar
          archivedOnly={inbox.archivedOnly}
          assignableMembers={inbox.assignableMembers}
          availableTags={inbox.availableTags}
          canAssign={inbox.permissions.canAssign}
          canReadUnassigned={inbox.permissions.canReadUnassigned}
          canManageConnections={
            inbox.permissions.canConnectionSetup ||
            inbox.permissions.canConnectionPair
          }
          canManageTags={inbox.permissions.canTagManage}
          canStartConversation={inbox.canStartConversation}
          connectionId={inbox.connectionId}
          connectionFilterId={inbox.connectionFilterId}
          connections={inbox.connections}
          currentUserId={inbox.currentUserId}
          onConnectionFilterChange={inbox.setConnectionFilterId}
          onArchivedOnlyChange={inbox.setArchivedOnly}
          onHumanAttendanceFilterChange={inbox.setHumanAttendanceFilter}
          onManageConnections={() => onScopeChange("connection")}
          onManageTags={() => onScopeChange("tags")}
          onOtherAssigneeChange={inbox.setOtherAssigneeId}
          onQuickFilterChange={inbox.setQuickFilter}
          onSearch={inbox.setSearch}
          onSelectionModeChange={(enabled) => {
            setSelectionMode(enabled);
            if (!enabled) inbox.clearSelectedSessions();
          }}
          onStartConversation={() => setNewConversationOpen(true)}
          onStatusFilterChange={(nextStatus) => {
            inbox.setStatusFilter(nextStatus);
            if (nextStatus === "COMPLETED" && inbox.quickFilter === "fresh") {
              inbox.setQuickFilter("all");
            }
          }}
          onTagFilterToggle={inbox.toggleTagFilter}
          onUnreadOnlyChange={inbox.setUnreadOnly}
          otherAssigneeId={inbox.otherAssigneeId}
          humanAttendanceFilter={inbox.humanAttendanceFilter}
          quickFilter={inbox.quickFilter}
          search={inbox.search}
          selectedTagIds={inbox.selectedTagIds}
          selectedCount={selectedCount}
          selectionMode={showSelectionMode}
          conversationCycleCounts={inbox.conversationCycleCounts}
          sessionCount={inbox.conversationCycles.length}
          statusFilter={inbox.statusFilter}
          startConversationUnavailableReason={
            inbox.startConversationUnavailableReason
          }
          unreadOnly={inbox.unreadOnly}
        >
          <CrmQueueBulkBar
            assignableMembers={inbox.assignableMembers}
            availableTags={inbox.availableTags}
            canAssign={inbox.permissions.canAssign && inbox.canAssignSessions}
            canClose={inbox.permissions.canClose}
            canRead={inbox.permissions.canRead}
            canTag={inbox.permissions.canTagAssign}
            onApply={inbox.actions.bulkApplySessions}
            onClear={inbox.clearSelectedSessions}
            onSelectAll={inbox.selectAllVisibleSessions}
            selectedCount={inbox.selectedSessions.length}
            visible={showSelectionMode}
          />
        </CrmQueueToolbar>
        <CrmQueueListPane
          inbox={inbox}
          onRequestDelete={(cycleId) => setDeleteCycleId(cycleId)}
          onSelect={(cycleId) => {
            setDetailsOpen(false);
            onCycleChange(cycleId);
            focusPane("chat");
          }}
          selectionMode={showSelectionMode}
        />
      </aside>

      <section
        className="crm-chat"
        aria-label="Detalhe da conversa"
        tabIndex={-1}
      >
        {activeSession ? (
          <>
            <ChatHeader
              actionsDisabled={
                inbox.isBlockingMutation || inbox.isMutatingSession
              }
              pendingActions={{
                assign: inbox.isSessionActionPending(
                  activeSession.id,
                  "assign",
                ),
                intervention: inbox.isSessionActionPending(
                  activeSession.id,
                  "intervention",
                ),
                read: inbox.isSessionActionPending(
                  activeSession.id,
                  activeSession.unreadCount ? "read" : "unread",
                ),
                tag: inbox.isSessionActionPending(activeSession.id, "tag"),
              }}
              assignableMembers={inbox.assignableMembers}
              availableTags={inbox.availableTags}
              messages={inbox.messages}
              onInsertPrompt={(text) => composerRef.current?.insertPrompt(text)}
              canAssignSession={
                inbox.permissions.canAssign && inbox.canAssignSessions
              }
              canCloseSession={inbox.permissions.canClose}
              canMarkRead={inbox.permissions.canRead}
              canScheduleMessages={
                providerCapabilities.allowScheduling &&
                (inbox.permissions.canScheduleCreate ||
                  inbox.permissions.canScheduleRead)
              }
              canTagSessions={inbox.permissions.canTagAssign}
              canToggleIntervention={inbox.permissions.canToggleIntervention}
              currentUserId={inbox.currentUserId}
              contactPresence={inbox.activeContactPresence}
              onBack={() => {
                onCycleChange(null);
                focusPane("list");
              }}
              onAddTag={async (input) => {
                const accepted = await inbox.actions.addCycleTag(
                  activeSession.id,
                  input,
                );
                if (accepted) void inbox.refreshTags();
                return accepted;
              }}
              onAssign={(assignedUserId) => {
                void inbox.actions.assignCycle(
                  activeSession.id,
                  assignedUserId,
                );
              }}
              onClose={() => setConclusionOpen(true)}
              onMarkRead={() => {
                void inbox.actions.markCycleRead(activeSession.id);
              }}
              onMarkUnread={() => {
                void inbox.actions.markCycleUnread(activeSession.id);
              }}
              onOpenDetails={() => {
                setDetailsOpen(true);
                focusPane("context");
              }}
              onRemoveTag={(tagId) =>
                inbox.actions.removeCycleTag(activeSession.id, tagId)
              }
              onScheduleMessage={() => setScheduleMessageOpen(true)}
              onScheduleVisit={() => setScheduleVisitOpen(true)}
              onToggleIntervention={() => {
                void inbox.actions.toggleIntervention(
                  activeSession.id,
                  activeSession.status !== "HUMAN_TAKEOVER",
                );
              }}
              cycle={activeSession}
            />
            <MessageList
              key={`${String(activeSession.id)}:${inbox.connectionFilterId ?? activeSessionConnection?.id ?? "default"}`}
              actionsDisabled={inbox.isBlockingMutation || !inbox.canSendText}
              fallbackAssigneeName={activeSession.assignedMember?.name ?? null}
              hasOlderMessages={inbox.hasOlderMessages}
              isLoading={
                !inbox.hasLoadedActiveMessages || inbox.isLoadingMessages
              }
              isLoadingOlderMessages={inbox.isLoadingOlderMessages}
              messages={inbox.messages}
              onDelete={
                inbox.permissions.canSend && providerCapabilities.allowDelete
                  ? inbox.deleteMessage
                  : undefined
              }
              onReconcileMessage={inbox.reconcileMessage}
              onReact={
                inbox.permissions.canSend && providerCapabilities.allowReactions
                  ? inbox.sendReaction
                  : undefined
              }
              onRemoveReaction={
                inbox.permissions.canSend && providerCapabilities.allowReactions
                  ? inbox.removeReaction
                  : undefined
              }
              onReply={
                inbox.permissions.canSend && providerCapabilities.allowReply
                  ? setReplyToMessage
                  : undefined
              }
              onRetryMessage={inbox.retryMessage}
              onFilesDropped={
                inbox.canSendText
                  ? (files) => composerRef.current?.openFiles(files)
                  : undefined
              }
              onLoadOlder={inbox.loadOlderMessages}
              olderMessagesError={inbox.olderMessagesError}
            />
            {inbox.canSendText ? (
              <>
                {providerCapabilities.officialWindowNotice ? (
                  <p className="crm-composer-notice" role="note">
                    {providerCapabilities.officialWindowNotice}
                  </p>
                ) : null}
                <MessageComposer
                  key={`${String(activeSession.id)}:${inbox.connectionFilterId ?? activeSessionConnection?.id ?? "default"}`}
                  capabilities={providerCapabilities}
                  ref={composerRef}
                  availableTags={inbox.availableTags}
                  canScheduleCreate={inbox.permissions.canScheduleCreate}
                  catalogUrl={inbox.catalogUrl}
                  cycle={activeSession}
                  defaultLocationName={inbox.storeLocationName}
                  disabled={inbox.isSending}
                  onAddCycleTag={async (input) => {
                    const accepted = await inbox.actions.addCycleTag(
                      activeSession.id,
                      input,
                    );
                    if (accepted) void inbox.refreshTags();
                    return accepted;
                  }}
                  onCancelReply={() => setReplyToMessage(null)}
                  onCancelScheduledMessage={(scheduledMessageId) =>
                    inbox.cancelScheduledMessage(scheduledMessageId)
                  }
                  onListScheduledMessages={() =>
                    inbox.listScheduledMessages({ cycleId: activeSession.id })
                  }
                  onProcessDueScheduledMessages={() =>
                    inbox.processDueScheduledMessages()
                  }
                  onRemoveCycleTag={(tagId) =>
                    inbox.actions.removeCycleTag(activeSession.id, tagId)
                  }
                  onScheduleMessage={(input) =>
                    inbox.createScheduledMessage({
                      cycleId: activeSession.id,
                      ...input,
                    })
                  }
                  onCreateQuickMessage={inbox.createQuickMessage}
                  onDeleteQuickMessage={inbox.deleteQuickMessage}
                  onLoadCatalogProducts={inbox.listCatalogProducts}
                  onLoadVehicles={inbox.listVehicles}
                  onSend={async (text) => {
                    const accepted = await inbox.sendText(text, {
                      replyToMessage: providerCapabilities.allowReply
                        ? replyToMessage
                        : null,
                    });
                    if (accepted) setReplyToMessage(null);
                    return accepted;
                  }}
                  onSendCatalog={inbox.sendCatalog}
                  onSendCatalogProduct={inbox.sendCatalogProduct}
                  onSendLocation={inbox.sendLocation}
                  onSendMedia={inbox.sendMedia}
                  onSendQuickMessage={inbox.sendQuickMessage}
                  onSendVehicle={inbox.sendVehicle}
                  onUpdateQuickMessage={inbox.updateQuickMessage}
                  quickMessages={inbox.quickMessages}
                  replyToMessage={
                    providerCapabilities.allowReply ? replyToMessage : null
                  }
                />
              </>
            ) : (
              <CrmReadOnlyComposer
                {...(isDemoActive
                  ? {
                      reason:
                        "Histórico fictício para explorar o CRM. Conecte um canal oficial para enviar mensagens reais.",
                      title: "Demonstração · somente leitura",
                      ...(inbox.permissions.canConnectionSetup
                        ? {
                            actionLabel: "Configurar canal",
                            onAction: () => onScopeChange("connection"),
                          }
                        : {}),
                    }
                  : {
                      reason: inbox.permissions.canSend
                        ? inbox.sendUnavailableReason
                        : null,
                    })}
              />
            )}
          </>
        ) : (
          <CrmEmptyConversationPane
            canSetupConnection={inbox.permissions.canConnectionSetup}
            canStartConversation={inbox.canStartConversation}
            isDemoView={isDemoView}
            onFocusList={() => focusPane("list")}
            onFocusSearch={() => {
              const searchInput =
                shellRef.current?.querySelector<HTMLInputElement>(
                  ".crm-search input",
                );
              searchInput?.focus();
            }}
            onScopeChange={onScopeChange}
            onStartConversation={() => setNewConversationOpen(true)}
          />
        )}
      </section>
      {activeSession && detailsOpen ? (
        <button
          aria-label="Fechar detalhes"
          className="crm-details-scrim"
          onClick={() => {
            setDetailsOpen(false);
            focusPane("chat");
          }}
          type="button"
        />
      ) : null}
      {activeSession ? (
        <CrmConversationCycleDetailsPanel
          assignableMembers={inbox.assignableMembers}
          isOpen={detailsOpen}
          messages={inbox.messages}
          onClose={() => {
            setDetailsOpen(false);
            focusPane("chat");
          }}
          cycle={activeSession}
        />
      ) : null}
      <CrmWorkspaceOverlays
        activeSession={activeSession ?? null}
        conclusionOpen={conclusionOpen}
        deleteCycleId={deleteCycleId}
        inbox={inbox}
        newConversationDraft={newConversationDraft}
        newConversationOpen={newConversationOpen}
        onCloseConclusion={() => setConclusionOpen(false)}
        onCloseDelete={() => setDeleteCycleId(null)}
        onCloseNewConversation={() => {
          setNewConversationOpen(false);
          setNewConversationDraft(null);
        }}
        onConfirmDelete={() => {
          const cycleId = deleteCycleId;
          setDeleteCycleId(null);
          if (!cycleId) return;
          void inbox.actions.deleteCycle(cycleId);
          if (cycleId === inbox.activeCycleId) {
            onCycleChange(null);
            focusPane("list");
          }
        }}
        scheduleMessageOpen={scheduleMessageOpen}
        scheduleVisitOpen={scheduleVisitOpen}
        onCloseScheduleMessage={() => setScheduleMessageOpen(false)}
        onCloseScheduleVisit={() => setScheduleVisitOpen(false)}
        onStartedConversation={() => {
          focusPane("chat");
          setNewConversationDraft(null);
        }}
      />
    </section>
  );
}
