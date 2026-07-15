import { useEffect, useState } from "react";
import { ChatHeader, MessageComposer } from "./CrmWhatsappParts";
import { MessageList } from "./CrmWhatsappMessageParts";
import { WhatsappToolbar } from "./CrmWhatsappQueueToolbar";
import { SessionList } from "./CrmWhatsappSessionList";
import { WhatsappBulkBar } from "./CrmWhatsappBulkBar";
import { CrmWhatsappReadOnlyComposer } from "./CrmWhatsappReadOnlyComposer";
import { CrmWhatsappNewConversationDialog } from "./CrmWhatsappNewConversationDialog";
import { CrmWhatsappSessionDetailsPanel } from "./CrmWhatsappSessionDetailsPanel";
import type { readWhatsappStatus } from "./crmWhatsappConnectionStatus";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";
import type { CrmWhatsappScope } from "./CrmWhatsappScopedNav";
import { readInitialSessionId } from "./crmWhatsappHookSupport";

export function CrmWhatsappConversationWorkspace({
  inbox,
  onScopeChange,
  status,
}: {
  inbox: ReturnType<typeof useCrmWhatsappInbox>;
  onScopeChange: (scope: CrmWhatsappScope) => void;
  status: ReturnType<typeof readWhatsappStatus>;
}) {
  const activeSession = inbox.activeSession;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"chat" | "list">(() =>
    readInitialSessionId() ? "chat" : "list",
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] =
    useState<CrmWhatsappMessage | null>(null);
  const selectedCount = inbox.selectedSessions.length;
  const showSelectionMode = selectionMode || selectedCount > 0;

  useEffect(() => {
    setReplyToMessage(null);
    setDetailsOpen(false);
  }, [inbox.activeSessionId]);

  return (
    <section className="crm-whatsapp-shell" data-mobile-pane={mobilePane}>
      <aside className="crm-whatsapp-list" aria-label="Conversas do WhatsApp">
        <WhatsappToolbar
          assignableMembers={inbox.assignableMembers}
          availableTags={inbox.availableTags}
          canManageConnections={inbox.permissions.canConnectionManage}
          canManageTags={inbox.permissions.canTagManage}
          canStartConversation={inbox.canSendText}
          connectionId={inbox.connectionId}
          connectionFilterId={inbox.connectionFilterId}
          connections={inbox.connections}
          currentUserId={inbox.currentUserId}
          onConnectionFilterChange={inbox.setConnectionFilterId}
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
          onStatusFilterChange={inbox.setStatusFilter}
          onTagFilterToggle={inbox.toggleTagFilter}
          onUnreadOnlyChange={inbox.setUnreadOnly}
          otherAssigneeId={inbox.otherAssigneeId}
          quickFilter={inbox.quickFilter}
          search={inbox.search}
          selectedTagIds={inbox.selectedTagIds}
          selectedCount={selectedCount}
          selectionMode={showSelectionMode}
          sessionCounts={inbox.sessionCounts}
          sessionCount={inbox.sessions.length}
          statusFilter={inbox.statusFilter}
          statusLabel={status.label}
          statusTone={status.tone}
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
              setMobilePane("chat");
            }}
            onToggleSelected={inbox.toggleSelectedSession}
            selectedSessionIds={inbox.selectedSessionIds}
            selectionMode={showSelectionMode}
            sessions={inbox.sessions}
          />
        )}
      </aside>

      <section className="crm-whatsapp-chat" aria-label="Detalhe da conversa">
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
                inbox.permissions.canScheduleCreate ||
                inbox.permissions.canScheduleRead
              }
              canTagSessions={inbox.permissions.canTagAssign}
              canToggleIntervention={inbox.permissions.canToggleIntervention}
              currentUserId={inbox.currentUserId}
              onBack={() => setMobilePane("list")}
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
              onOpenDetails={() => setDetailsOpen(true)}
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
                inbox.permissions.canSend ? inbox.deleteMessage : undefined
              }
              onReact={
                inbox.permissions.canSend ? inbox.sendReaction : undefined
              }
              onRemoveReaction={
                inbox.permissions.canSend ? inbox.removeReaction : undefined
              }
              onReply={
                inbox.permissions.canSend ? setReplyToMessage : undefined
              }
            />
            {inbox.canSendText ? (
              <MessageComposer
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
                    replyToMessage,
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
                replyToMessage={replyToMessage}
              />
            ) : (
              <CrmWhatsappReadOnlyComposer />
            )}
            {detailsOpen ? (
              <CrmWhatsappSessionDetailsPanel
                assignableMembers={inbox.assignableMembers}
                onClose={() => setDetailsOpen(false)}
                session={activeSession}
              />
            ) : null}
          </>
        ) : (
          <div className="crm-whatsapp-empty">
            Selecione uma conversa para continuar o atendimento.
          </div>
        )}
      </section>
      {newConversationOpen ? (
        <CrmWhatsappNewConversationDialog
          disabled={inbox.isStartingConversation || !inbox.canSendText}
          onClose={() => setNewConversationOpen(false)}
          onStart={async (input) => {
            const accepted = await inbox.startConversation(input);
            if (accepted) setMobilePane("chat");
            return accepted;
          }}
        />
      ) : null}
    </section>
  );
}
