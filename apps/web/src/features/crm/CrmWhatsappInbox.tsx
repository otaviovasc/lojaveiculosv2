import { useEffect, useMemo, useRef, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { createRuntimeCrmWhatsappApi } from "./runtimeApi";
import { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";
import { WhatsappNotice } from "./CrmWhatsappNotice";
import { CrmWhatsappNewConversationDialog } from "./CrmWhatsappNewConversationDialog";
import { CrmWhatsappConnectionAdmin } from "./CrmWhatsappConnectionAdmin";
import { CrmWhatsappTagManager } from "./CrmWhatsappTagManager";
import { readWhatsappStatus } from "./crmWhatsappConnectionStatus";
import { totalUnreadSessions } from "./crmWhatsappQueueState";
import {
  CrmWhatsappScopedNav,
  type CrmWhatsappScope,
} from "./CrmWhatsappScopedNav";
import { CrmWhatsappConversationWorkspace } from "./CrmWhatsappConversationWorkspace";
import {
  WhatsappCampaignsSection,
  WhatsappIntegrationsSection,
} from "./CrmWhatsappScopedSections";
import { CrmWhatsappVisitsPage } from "./CrmWhatsappVisitsPage";

export function CrmWhatsappInbox({ api }: { api?: CrmWhatsappApi }) {
  const whatsappApi = useMemo(
    () => api ?? createRuntimeCrmWhatsappApi(),
    [api],
  );
  const inbox = useCrmWhatsappInbox(whatsappApi);
  const [activeScope, setActiveScope] =
    useState<CrmWhatsappScope>("conversations");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const originalTitleRef = useRef(
    typeof document === "undefined" ? "CRM" : document.title,
  );
  const unreadCount = totalUnreadSessions(inbox.sessions);
  const status = readWhatsappStatus({
    hasConnection: inbox.hasConnection,
    isLoading: inbox.connectionIsLoading,
    connectionError: inbox.connectionError,
  });

  useEffect(() => {
    document.title = unreadCount
      ? `(${unreadCount}) Nova mensagem - CRM`
      : originalTitleRef.current;
  }, [unreadCount]);

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
      {inbox.permissions.canList ? (
        <>
          <CrmWhatsappScopedNav
            activeScope={activeScope}
            connectionLabel={status.label}
            connectionTone={status.tone}
            onChange={setActiveScope}
            tagCount={inbox.availableTags.length}
            unreadCount={unreadCount}
          />
          {activeScope === "conversations" ? (
            <CrmWhatsappConversationWorkspace
              inbox={inbox}
              onScopeChange={setActiveScope}
              onStartConversation={() => setNewConversationOpen(true)}
              status={status}
            />
          ) : null}
          {activeScope === "connection" ? (
            <section className="crm-whatsapp-section">
              <CrmWhatsappConnectionAdmin
                connections={inbox.connections}
                disabled={!inbox.permissions.canConnectionManage}
                embedded
                onClose={() => setActiveScope("conversations")}
                onRefresh={inbox.refreshConnections}
                onUpdate={inbox.updateConnection}
              />
            </section>
          ) : null}
          {activeScope === "campaigns" ? (
            <WhatsappCampaignsSection inbox={inbox} />
          ) : null}
          {activeScope === "integrations" ? (
            <WhatsappIntegrationsSection
              api={whatsappApi}
              canManage={inbox.permissions.canIntegrationsManage}
              canRead={inbox.permissions.canRead}
              canRetry={inbox.permissions.canSend}
            />
          ) : null}
          {activeScope === "tags" ? (
            <section className="crm-whatsapp-section">
              <CrmWhatsappTagManager
                disabled={!inbox.permissions.canTagManage}
                embedded
                onClose={() => setActiveScope("conversations")}
                onCreate={inbox.createTag}
                onDelete={inbox.deleteTag}
                onReorder={inbox.reorderTags}
                onUpdate={inbox.updateTag}
                tags={inbox.availableTags}
              />
            </section>
          ) : null}
          {activeScope === "visits" ? (
            <CrmWhatsappVisitsPage
              activeSession={inbox.activeSession}
              canManage={inbox.permissions.canVisitsManage}
              canRead={inbox.permissions.canVisitsRead}
            />
          ) : null}
        </>
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
