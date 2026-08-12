import { useEffect, useRef, useState } from "react";
import { ChatHeader, MessageComposer } from "./CrmWhatsappParts";
import { MessageList } from "./CrmWhatsappMessageParts";
import { WhatsappToolbar } from "./CrmWhatsappQueueToolbar";
import { SessionList } from "./CrmWhatsappSessionList";
import { WhatsappBulkBar } from "./CrmWhatsappBulkBar";
import { CrmWhatsappReadOnlyComposer } from "./CrmWhatsappReadOnlyComposer";
import { CrmWhatsappNewConversationDialog } from "./CrmWhatsappNewConversationDialog";
import { CrmWhatsappSessionDetailsPanel } from "./CrmWhatsappSessionDetailsPanel";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";
import type { CrmWhatsappScope } from "./CrmWhatsappScopedNav";
import { readInitialSessionId } from "./crmWhatsappHookSupport";
import { readCrmWhatsappConnectionCapabilities } from "./crmWhatsappProviderCapabilities";

export function CrmWhatsappConversationWorkspace({
  inbox,
  onScopeChange,
}: {
  inbox: ReturnType<typeof useCrmWhatsappInbox>;
  onScopeChange: (scope: CrmWhatsappScope) => void;
}) {
  const activeSession = inbox.activeSession;
  const shellRef = useRef<HTMLElement>(null);
  const [mobilePane, setMobilePane] = useState<"chat" | "context" | "list">(
    () => (readInitialSessionId() ? "chat" : "list"),
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] =
    useState<CrmWhatsappMessage | null>(null);
  const selectedCount = inbox.selectedSessions.length;
  const showSelectionMode = selectionMode || selectedCount > 0;
  const activeSessionConnection = inbox.activeSession?.connection?.id
    ? (inbox.connections.find(
        (connection) =>
          String(connection.id) === String(inbox.activeSession?.connection?.id),
      ) ?? inbox.activeSession.connection)
    : null;
  const providerCapabilities = readCrmWhatsappConnectionCapabilities(
    activeSessionConnection,
  );

  useEffect(() => {
    setReplyToMessage(null);
  }, [inbox.activeSessionId]);

  const focusPane = (pane: "chat" | "context" | "list") => {
    setMobilePane(pane);
    window.requestAnimationFrame(() => {
      const selector =
        pane === "list"
          ? ".crm-whatsapp-list"
          : pane === "chat"
            ? ".crm-whatsapp-chat"
            : ".crm-whatsapp-details-panel";
      shellRef.current?.querySelector<HTMLElement>(selector)?.focus();
    });
  };

  return (
    <section
      aria-keyshortcuts="Alt+1 Alt+2 Alt+3"
      className="crm-whatsapp-shell"
      data-mobile-pane={mobilePane}
      onKeyDown={(event) => {
        if (!event.altKey || !["1", "2", "3"].includes(event.key)) return;
        event.preventDefault();
        focusPane(
          event.key === "1" ? "list" : event.key === "2" ? "chat" : "context",
        );
      }}
      ref={shellRef}
    >
      <aside
        className="crm-whatsapp-list"
        aria-label="Fila de conversas"
        tabIndex={-1}
      >
        <WhatsappToolbar
          assignableMembers={inbox.assignableMembers}
          availableTags={inbox.availableTags}
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
          sessionCounts={inbox.sessionCounts}
          sessionCount={inbox.sessions.length}
          statusFilter={inbox.statusFilter}
          startConversationUnavailableReason={
            inbox.startConversationUnavailableReason
          }
          unreadOnly={inbox.unreadOnly}
        >
          <WhatsappBulkBar
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
        </WhatsappToolbar>
        {inbox.isLoading ? (
          <div className="crm-whatsapp-empty crm-whatsapp-empty-list">
            Carregando conversas...
          </div>
        ) : (
          <SessionList
            activeSessionId={inbox.activeSessionId}
            onSelect={(sessionId) => {
              inbox.setActiveSessionId(sessionId);
              focusPane("chat");
            }}
            onToggleSelected={inbox.toggleSelectedSession}
            selectedSessionIds={inbox.selectedSessionIds}
            selectionMode={showSelectionMode}
            sessions={inbox.sessions}
          />
        )}
      </aside>

      <section
        className="crm-whatsapp-chat"
        aria-label="Detalhe da conversa"
        tabIndex={-1}
      >
        {activeSession ? (
          <>
            <ChatHeader
              actionsDisabled={inbox.isMutatingSession}
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
              onBack={() => focusPane("list")}
              onAddTag={async (input) => {
                const accepted = await inbox.actions.addSessionTag(
                  activeSession.id,
                  input,
                );
                if (accepted) void inbox.refreshTags();
                return accepted;
              }}
              onAssign={(assignedUserId) => {
                void inbox.actions.assignSession(
                  activeSession.id,
                  assignedUserId,
                );
              }}
              onClose={() => {
                void inbox.actions.closeSession(activeSession.id);
              }}
              onMarkRead={() => {
                void inbox.actions.markSessionRead(activeSession.id);
              }}
              onMarkUnread={() => {
                void inbox.actions.markSessionUnread(activeSession.id);
              }}
              onOpenDetails={() => focusPane("context")}
              onRemoveTag={(tagId) =>
                inbox.actions.removeSessionTag(activeSession.id, tagId)
              }
              onScheduleMessage={() => onScopeChange("schedules")}
              onToggleIntervention={() => {
                void inbox.actions.toggleIntervention(
                  activeSession.id,
                  activeSession.status !== "HUMAN_TAKEOVER",
                );
              }}
              session={activeSession}
            />
            <MessageList
              actionsDisabled={inbox.isSending || !inbox.canSendText}
              isLoading={inbox.isLoadingMessages}
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
            />
            {inbox.canSendText ? (
              <>
                {providerCapabilities.officialWindowNotice ? (
                  <p className="crm-whatsapp-composer-notice" role="note">
                    {providerCapabilities.officialWindowNotice}
                  </p>
                ) : null}
                <MessageComposer
                  key={`${String(activeSession.id)}:${String(
                    activeSessionConnection?.id ?? "unknown",
                  )}`}
                  capabilities={providerCapabilities}
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
              <CrmWhatsappReadOnlyComposer
                reason={
                  inbox.permissions.canSend ? inbox.sendUnavailableReason : null
                }
              />
            )}
          </>
        ) : (
          <div className="crm-whatsapp-empty">
            Selecione uma conversa para continuar o atendimento.
          </div>
        )}
      </section>
      {activeSession ? (
        <CrmWhatsappSessionDetailsPanel
          assignableMembers={inbox.assignableMembers}
          mobileOnlyClose
          onClose={() => focusPane("chat")}
          session={activeSession}
        />
      ) : (
        <aside
          aria-label="Contexto da conversa"
          className="crm-whatsapp-details-panel crm-whatsapp-details-placeholder"
          tabIndex={-1}
        >
          Selecione uma conversa para consultar lead, responsável e origem.
        </aside>
      )}
      {newConversationOpen ? (
        <CrmWhatsappNewConversationDialog
          disabled={inbox.isStartingConversation || !inbox.canStartConversation}
          onClose={() => setNewConversationOpen(false)}
          onStart={async (input) => {
            const accepted = await inbox.startConversation(input);
            if (accepted) focusPane("chat");
            return accepted;
          }}
          provider={
            inbox.startConversationProvider === "composio_whatsapp"
              ? "composio_whatsapp"
              : "zapi"
          }
        />
      ) : null}
    </section>
  );
}
