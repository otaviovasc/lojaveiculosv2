import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Megaphone,
  MessageSquareText,
  Plus,
  Search,
} from "lucide-react";
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
import { CrmScheduleMessageDialog } from "./CrmScheduleMessageDialog";
import { CrmVisitSessionDialog } from "./CrmVisitSessionDialog";
import type { useCrmInbox } from "./useCrmInbox";
import type {
  CrmConversationCycle,
  CrmConversationCycleId,
  CrmMessage,
  CrmProviderConnection,
} from "./crmConversationTypes";
import type { CrmScope } from "./CrmScopedNav";
import type { MessageComposerHandle } from "./CrmComposer";
import { readCrmConnectionCapabilities } from "./crmProviderCapabilities";
import { isUiDemoConnection } from "./crmConnectionSelection";

export function CrmConversationWorkspace({
  hideQueue,
  inbox,
  onCycleChange,
  onScopeChange,
  onStartSale,
  routeCycleId,
}: {
  hideQueue?: boolean;
  inbox: ReturnType<typeof useCrmInbox>;
  onCycleChange: (cycleId: CrmConversationCycleId | null) => void;
  onScopeChange: (scope: CrmScope) => void;
  onStartSale?: ((cycle: CrmConversationCycle) => void) | undefined;
  routeCycleId: CrmConversationCycleId | null;
}) {
  const activeSession = inbox.activeSession;
  const shellRef = useRef<HTMLElement>(null);
  const composerRef = useRef<MessageComposerHandle>(null);
  const [mobilePane, setMobilePane] = useState<"chat" | "context" | "list">(
    () => (hideQueue || routeCycleId ? "chat" : "list"),
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

  useEffect(() => {
    const onJump = (event: Event) => {
      const { messageId } = (event as CustomEvent<{ messageId: string }>)
        .detail;
      if (!messageId) return;
      const el =
        shellRef.current?.querySelector<HTMLElement>(
          `[data-message-id="${String(messageId)}"]`,
        ) ??
        shellRef.current?.querySelector<HTMLElement>(
          `#crm-msg-${String(messageId).replace(/"/g, "")}`,
        );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("crm-message-highlight");
        setTimeout(() => el.classList.remove("crm-message-highlight"), 1800);
      } else {
        // fallback: smooth scroll messages container toward bottom where hit likely is
        const scroller =
          shellRef.current?.querySelector<HTMLElement>(".crm-messages");
        scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
      }
    };
    const onToggleTag = (event: Event) => {
      const { tagId, cycleId } = (
        event as CustomEvent<{ tagId: string; cycleId: string }>
      ).detail;
      if (!tagId || !cycleId) return;
      const target = inbox.conversationCycles.find(
        (c) => String(c.id) === String(cycleId),
      );
      const hasTag = target?.tags?.some((t) => String(t.id) === String(tagId));
      if (hasTag)
        void inbox.actions.removeCycleTag(
          cycleId as CrmConversationCycleId,
          tagId,
        );
      else
        void inbox.actions.addCycleTag(
          cycleId as CrmConversationCycleId,
          { tagId } as unknown as Parameters<
            typeof inbox.actions.addCycleTag
          >[1],
        );
    };
    window.addEventListener("crm:jump-to-message", onJump);
    window.addEventListener("crm:toggle-tag", onToggleTag);
    return () => {
      window.removeEventListener("crm:jump-to-message", onJump);
      window.removeEventListener("crm:toggle-tag", onToggleTag);
    };
  }, [inbox]);

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
      data-standalone-chat={hideQueue ? "true" : undefined}
      ref={shellRef}
    >
      {!hideQueue && (
        <aside
          className="crm-list"
          aria-label="Fila de conversas"
          tabIndex={-1}
        >
          <CrmQueueToolbar
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
      )}

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
              onBack={
                hideQueue
                  ? undefined
                  : () => {
                      onCycleChange(null);
                      focusPane("list");
                    }
              }
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

              <div className="crm-empty-conversation-grid">
                <button
                  className="crm-empty-quick-action"
                  disabled={!inbox.canStartConversation}
                  onClick={() => setNewConversationOpen(true)}
                  type="button"
                >
                  <span className="crm-empty-action-icon crm-empty-action-emerald">
                    <Plus className="size-4" />
                  </span>
                  <div className="crm-empty-action-text">
                    <strong>Nova conversa</strong>
                    <small>Iniciar contato por telefone</small>
                  </div>
                </button>

                <button
                  className="crm-empty-quick-action"
                  onClick={() => onScopeChange("visits")}
                  type="button"
                >
                  <span className="crm-empty-action-icon crm-empty-action-blue">
                    <CalendarCheck className="size-4" />
                  </span>
                  <div className="crm-empty-action-text">
                    <strong>Visitas & Test Drives</strong>
                    <small>Agenda presencial na loja</small>
                  </div>
                </button>

                <button
                  className="crm-empty-quick-action"
                  onClick={() => onScopeChange("schedules")}
                  type="button"
                >
                  <span className="crm-empty-action-icon crm-empty-action-purple">
                    <CalendarClock className="size-4" />
                  </span>
                  <div className="crm-empty-action-text">
                    <strong>Mensagens agendadas</strong>
                    <small>Disparos programados</small>
                  </div>
                </button>

                <button
                  className="crm-empty-quick-action"
                  onClick={() => onScopeChange("campaigns")}
                  type="button"
                >
                  <span className="crm-empty-action-icon crm-empty-action-amber">
                    <Megaphone className="size-4" />
                  </span>
                  <div className="crm-empty-action-text">
                    <strong>Campanhas & Disparos</strong>
                    <small>Transmissões para clientes</small>
                  </div>
                </button>
              </div>

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
                <button
                  className="crm-empty-shortcut-btn"
                  onClick={() => focusPane("list")}
                  type="button"
                >
                  <kbd>Alt</kbd> + <kbd>1</kbd> <span>Focar lista</span>
                </button>
                <button
                  className="crm-empty-shortcut-btn"
                  onClick={() => {
                    const searchInput =
                      shellRef.current?.querySelector<HTMLInputElement>(
                        ".crm-search input",
                      );
                    searchInput?.focus();
                  }}
                  type="button"
                >
                  <Search className="size-3" />
                  <span>Pesquisar conversas</span>
                </button>
              </div>
            </div>
          </div>
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
      {newConversationOpen ? (
        <CrmNewConversationDialog
          disabled={inbox.isStartingConversation || !inbox.canStartConversation}
          initialBuyerName={newConversationDraft?.buyerName ?? ""}
          initialPhone={newConversationDraft?.phone ?? ""}
          onClose={() => {
            setNewConversationOpen(false);
            setNewConversationDraft(null);
          }}
          onStart={async (input) => {
            const accepted = await inbox.startConversation(input);
            if (accepted) {
              focusPane("chat");
              setNewConversationDraft(null);
            }
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
          onStartSale={onStartSale}
          cycle={activeSession}
        />
      ) : null}
      {activeSession && scheduleMessageOpen ? (
        <CrmScheduleMessageDialog
          canCancel={true}
          canCreate={inbox.permissions.canScheduleCreate}
          canProcess={true}
          canRead={true}
          onCancel={(scheduledMessageId) =>
            inbox.cancelScheduledMessage(scheduledMessageId)
          }
          onClose={() => setScheduleMessageOpen(false)}
          onList={() =>
            inbox.listScheduledMessages({ cycleId: activeSession.id })
          }
          onProcessDue={() => inbox.processDueScheduledMessages()}
          onSchedule={(input) =>
            inbox.createScheduledMessage({
              cycleId: activeSession.id,
              ...input,
            })
          }
        />
      ) : null}
      {activeSession && scheduleVisitOpen ? (
        <CrmVisitSessionDialog
          cycle={activeSession}
          listVehicles={inbox.listVehicles}
          onClose={() => setScheduleVisitOpen(false)}
        />
      ) : null}
    </section>
  );
}
