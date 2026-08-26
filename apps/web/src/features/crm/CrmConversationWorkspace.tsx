import { useEffect, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { ChatHeader, MessageComposer } from "./CrmConversationParts";
import { MessageList } from "./CrmMessageParts";
import { CrmQueueToolbar } from "./CrmQueueToolbar";
import { SessionList } from "./CrmConversationCycleList";
import { SessionListSkeleton } from "./CrmSkeletons";
import { CrmQueueBulkBar } from "./CrmQueueBulkBar";
import { CrmReadOnlyComposer } from "./CrmReadOnlyComposer";
import { CrmNewConversationDialog } from "./CrmNewConversationDialog";
import { CrmAttendanceConclusionDialog } from "./CrmAttendanceConclusionDialog";
import { CrmConversationCycleDetailsPanel } from "./CrmConversationCycleDetailsPanel";
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
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [conclusionOpen, setConclusionOpen] = useState(false);
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
    setReplyToMessage(null);
    setDetailsOpen(false);
    setConclusionOpen(false);
  }, [inbox.activeCycleId, inbox.connectionFilterId]);

  useEffect(() => {
    setMobilePane(routeCycleId ? "chat" : "list");
  }, [routeCycleId]);

  const focusPane = (pane: "chat" | "context" | "list") => {
    setMobilePane(pane);
    window.requestAnimationFrame(() => {
      const selector =
        pane === "list"
          ? ".crm-list"
          : pane === "chat"
            ? ".crm-chat"
            : ".crm-details-panel";
      shellRef.current?.querySelector<HTMLElement>(selector)?.focus();
    });
  };

  return (
    <section
      aria-keyshortcuts="Alt+1 Alt+2"
      className="crm-shell"
      data-details-open={detailsOpen ? "true" : "false"}
      data-mobile-pane={mobilePane}
      onKeyDown={(event) => {
        if (!event.altKey || !["1", "2"].includes(event.key)) return;
        event.preventDefault();
        focusPane(event.key === "1" ? "list" : "chat");
      }}
      ref={shellRef}
    >
      <aside className="crm-list" aria-label="Fila de conversas" tabIndex={-1}>
        <CrmQueueToolbar
          assignableMembers={inbox.assignableMembers}
          availableTags={inbox.availableTags}
          canAssign={inbox.permissions.canAssign}
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
        {inbox.isLoading && !inbox.conversationCycles.length ? (
          <SessionListSkeleton />
        ) : (
          <SessionList
            activeCycleId={inbox.activeCycleId}
            hasMore={inbox.hasMoreSessions}
            isLoadingMore={inbox.isLoadingMoreSessions}
            onLoadMore={() => void inbox.loadMoreSessions()}
            onRefresh={() =>
              void inbox.refreshSessions({ preserveLocalOnly: true })
            }
            onSelect={(cycleId) => {
              setDetailsOpen(false);
              onCycleChange(cycleId);
              focusPane("chat");
            }}
            onToggleRead={(cycle) => {
              if (cycle.unreadCount) {
                void inbox.actions.markCycleRead(cycle.id);
              } else {
                void inbox.actions.markCycleUnread(cycle.id);
              }
            }}
            onToggleSelected={inbox.toggleSelectedSession}
            selectedCycleIds={inbox.selectedCycleIds}
            selectionMode={showSelectionMode}
            conversationCycles={inbox.conversationCycles}
          />
        )}
      </aside>

      <section
        className="crm-chat"
        aria-label="Detalhe da conversa"
        tabIndex={-1}
      >
        {activeSession ? (
          <>
            <ChatHeader
              actionsDisabled={inbox.isMutatingSession}
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
              onScheduleMessage={() => onScopeChange("schedules")}
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
              actionsDisabled={inbox.isSending || !inbox.canSendText}
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
                  catalogUrl={inbox.catalogUrl}
                  defaultLocationName={inbox.storeLocationName}
                  disabled={inbox.isSending}
                  onCancelReply={() => setReplyToMessage(null)}
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
          <div className="crm-empty crm-empty-conversation-state">
            <div className="crm-empty-conversation-card">
              <span aria-hidden="true" className="crm-empty-conversation-icon">
                <MessageSquareText />
              </span>
              <span className="crm-empty-conversation-tag">
                {isDemoView ? "Demonstração" : "WhatsApp CRM"}
              </span>
              <h2>Selecione uma conversa</h2>
              <p>
                {isDemoView
                  ? "Histórico fictício para explorar o CRM. Escolha um contato na fila ao lado para navegar nas conversas de demonstração."
                  : "Escolha um contato na fila ao lado para visualizar o histórico de mensagens, negociações de veículos, propostas e agendamentos."}
              </p>
              {isDemoView && inbox.permissions.canConnectionSetup ? (
                <div className="crm-empty-conversation-action">
                  <button
                    className="crm-action"
                    onClick={() => onScopeChange("connection")}
                    type="button"
                  >
                    Configurar canal
                  </button>
                </div>
              ) : null}
              <div className="crm-empty-conversation-shortcuts">
                <span>
                  <kbd>Alt</kbd> + <kbd>1</kbd> Focar lista
                </span>
                <span>
                  <kbd>Alt</kbd> + <kbd>2</kbd> Focar conversa
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
      {activeSession && detailsOpen ? (
        <CrmConversationCycleDetailsPanel
          assignableMembers={inbox.assignableMembers}
          onClose={() => {
            setDetailsOpen(false);
            focusPane("chat");
          }}
          cycle={activeSession}
        />
      ) : null}
      {newConversationOpen ? (
        <CrmNewConversationDialog
          disabled={inbox.isStartingConversation || !inbox.canStartConversation}
          onClose={() => setNewConversationOpen(false)}
          onStart={async (input) => {
            const accepted = await inbox.startConversation(input);
            if (accepted) focusPane("chat");
            return accepted;
          }}
          provider={
            inbox.startConversationProvider === "meta_cloud"
              ? "meta_cloud"
              : "zapi"
          }
        />
      ) : null}
      {activeSession && conclusionOpen ? (
        <CrmAttendanceConclusionDialog
          assignableMembers={inbox.assignableMembers}
          disabled={
            inbox.isConcludingSession ||
            inbox.isMutatingSession ||
            !inbox.permissions.canClose
          }
          onClose={() => setConclusionOpen(false)}
          onConclude={(input) =>
            inbox.actions.concludeCycle(activeSession.id, input)
          }
          cycle={activeSession}
        />
      ) : null}
    </section>
  );
}
