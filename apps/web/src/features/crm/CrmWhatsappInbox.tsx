import { useEffect, useMemo, useRef, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { createRuntimeCrmWhatsappApi } from "./runtimeApi";
import { CrmWhatsappFailedEventsPanel } from "./CrmWhatsappFailedEventsPanel";
import { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";
import { ChatHeader, MessageComposer } from "./CrmWhatsappParts";
import { WhatsappNotice } from "./CrmWhatsappNotice";
import { MessageList } from "./CrmWhatsappMessageParts";
import { WhatsappToolbar } from "./CrmWhatsappQueueToolbar";
import { SessionList } from "./CrmWhatsappSessionList";
import { WhatsappBulkBar } from "./CrmWhatsappBulkBar";
import { CrmWhatsappNewConversationDialog } from "./CrmWhatsappNewConversationDialog";
import { CrmWhatsappReadOnlyComposer } from "./CrmWhatsappReadOnlyComposer";
import { CrmWhatsappSessionDetailsPanel } from "./CrmWhatsappSessionDetailsPanel";
import { readWhatsappStatus } from "./crmWhatsappConnectionStatus";
import { totalUnreadSessions } from "./crmWhatsappQueueState";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

export function CrmWhatsappInbox({ api }: { api?: CrmWhatsappApi }) {
  const whatsappApi = useMemo(
    () => api ?? createRuntimeCrmWhatsappApi(),
    [api],
  );
  const inbox = useCrmWhatsappInbox(whatsappApi);
  const activeSession = inbox.activeSession;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] =
    useState<CrmWhatsappMessage | null>(null);
  const originalTitleRef = useRef(
    typeof document === "undefined" ? "CRM" : document.title,
  );
  const status = readWhatsappStatus({
    hasConnection: inbox.hasConnection,
    isLoading: inbox.connectionIsLoading,
    connectionError: inbox.connectionError,
  });

  useEffect(() => {
    setReplyToMessage(null);
    setDetailsOpen(false);
  }, [inbox.activeSessionId]);

  useEffect(() => {
    const totalUnread = totalUnreadSessions(inbox.sessions);
    document.title = totalUnread
      ? `(${totalUnread}) Nova mensagem - CRM`
      : originalTitleRef.current;
  }, [inbox.sessions]);

  return (
    <main className="crm-whatsapp-page">
      {inbox.error ? (
        <WhatsappNotice
          message={formatApiErrorDisplay(
            inbox.error,
            "Não foi possível carregar o WhatsApp.",
          )}
        />
      ) : null}
      {inbox.hasConnection === false ? (
        <WhatsappNotice message="Nenhuma conexão WhatsApp ativa foi encontrada para a loja." />
      ) : null}
      {!inbox.permissions.canList ? (
        <WhatsappNotice message="Seu usuario nao tem permissao para visualizar o WhatsApp CRM." />
      ) : null}
      {inbox.permissions.canRead ? (
        <CrmWhatsappFailedEventsPanel
          api={whatsappApi}
          canRetry={inbox.permissions.canSend}
        />
      ) : null}

      {inbox.permissions.canList ? (
        <section className="crm-whatsapp-shell">
          <aside
            className="crm-whatsapp-list"
            aria-label="Conversas do WhatsApp"
          >
            <WhatsappToolbar
              availableTags={inbox.availableTags}
              canStartConversation={inbox.canSendText}
              connectionId={inbox.connectionId}
              connectionFilterId={inbox.connectionFilterId}
              connections={inbox.connections}
              onConnectionFilterChange={inbox.setConnectionFilterId}
              onQuickFilterChange={inbox.setQuickFilter}
              onSearch={inbox.setSearch}
              onStartConversation={() => setNewConversationOpen(true)}
              onStatusFilterChange={inbox.setStatusFilter}
              onTagFilterToggle={inbox.toggleTagFilter}
              onUnreadOnlyChange={inbox.setUnreadOnly}
              quickFilter={inbox.quickFilter}
              search={inbox.search}
              selectedTagIds={inbox.selectedTagIds}
              sessionCounts={inbox.sessionCounts}
              sessionCount={inbox.sessions.length}
              statusFilter={inbox.statusFilter}
              statusLabel={status.label}
              statusTone={status.tone}
              unreadOnly={inbox.unreadOnly}
            />
            <WhatsappBulkBar
              agents={inbox.agents}
              canAssign={inbox.permissions.canAssign && inbox.canAssignSessions}
              canClose={inbox.permissions.canClose}
              canRead={inbox.permissions.canRead}
              onAssign={(assignedUserId) => {
                void inbox.actions.bulkAssignSessions(assignedUserId);
              }}
              onClear={inbox.clearSelectedSessions}
              onClose={() => {
                void inbox.actions.bulkCloseSessions();
              }}
              onMarkRead={() => {
                void inbox.actions.bulkMarkSessionsRead();
              }}
              onMarkUnread={() => {
                void inbox.actions.bulkMarkSessionsUnread();
              }}
              onSelectAll={inbox.selectAllVisibleSessions}
              selectedCount={inbox.selectedSessions.length}
            />
            {inbox.isLoading ? (
              <div className="crm-whatsapp-empty crm-whatsapp-empty-list">
                Carregando conversas...
              </div>
            ) : (
              <SessionList
                activeSessionId={inbox.activeSessionId}
                onSelect={inbox.setActiveSessionId}
                onToggleSelected={inbox.toggleSelectedSession}
                selectedSessionIds={inbox.selectedSessionIds}
                sessions={inbox.sessions}
              />
            )}
          </aside>

          <section
            className="crm-whatsapp-chat"
            aria-label="Detalhe da conversa"
          >
            {activeSession ? (
              <>
                <ChatHeader
                  actionsDisabled={inbox.isMutatingSession}
                  agents={inbox.agents}
                  availableTags={inbox.availableTags}
                  canAssignSession={
                    inbox.permissions.canAssign && inbox.canAssignSessions
                  }
                  canCloseSession={inbox.permissions.canClose}
                  canMarkRead={inbox.permissions.canRead}
                  canSendMessages={inbox.permissions.canSend}
                  canToggleIntervention={
                    inbox.permissions.canToggleIntervention
                  }
                  currentUserId={inbox.currentUserId}
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
                    agents={inbox.agents}
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
        </section>
      ) : null}
      {newConversationOpen ? (
        <CrmWhatsappNewConversationDialog
          disabled={inbox.isStartingConversation || !inbox.canSendText}
          onClose={() => setNewConversationOpen(false)}
          onStart={inbox.startConversation}
        />
      ) : null}
    </main>
  );
}
