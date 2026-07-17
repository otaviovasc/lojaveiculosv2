import { useEffect, useMemo, useRef, useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { ProductCrmApi } from "./productCrmApi";
import {
  createRuntimeCrmWhatsappApi,
  createRuntimeProductCrmApi,
} from "./runtimeApi";
import { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";
import { WhatsappNotice } from "./CrmWhatsappNotice";
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
  WhatsappSchedulesSection,
} from "./CrmWhatsappScopedSections";
import { CrmWhatsappVisitsPage } from "./CrmWhatsappVisitsPage";
import { MessageCircle, PlugZap } from "lucide-react";

export function CrmWhatsappInbox({
  api,
  productApi,
}: {
  api?: CrmWhatsappApi;
  productApi?: ProductCrmApi;
}) {
  const whatsappApi = useMemo(
    () => api ?? createRuntimeCrmWhatsappApi(),
    [api],
  );
  const leadApi = useMemo(
    () => productApi ?? createRuntimeProductCrmApi(),
    [productApi],
  );
  const inbox = useCrmWhatsappInbox(whatsappApi);
  const [activeScope, setActiveScope] =
    useState<CrmWhatsappScope>("conversations");
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
            inbox.hasConnection === false ? (
              <WhatsappDisconnectedState
                canManage={inbox.permissions.canConnectionManage}
                onConnect={() => setActiveScope("connection")}
              />
            ) : (
              <CrmWhatsappConversationWorkspace
                inbox={inbox}
                onScopeChange={setActiveScope}
                status={status}
              />
            )
          ) : null}
          {activeScope === "connection" ? (
            <section className="crm-whatsapp-section">
              <CrmWhatsappConnectionAdmin
                connections={inbox.connections}
                disabled={!inbox.permissions.canConnectionManage}
                embedded
                onClose={() => setActiveScope("conversations")}
                onConfigureWebhooks={inbox.configureConnectionWebhooks}
                onRefresh={inbox.refreshConnections}
                onUpdate={inbox.updateConnection}
              />
            </section>
          ) : null}
          {activeScope === "campaigns" ? (
            <WhatsappCampaignsSection
              api={whatsappApi}
              inbox={inbox}
              leadApi={leadApi}
            />
          ) : null}
          {activeScope === "schedules" ? (
            <WhatsappSchedulesSection inbox={inbox} />
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
    </main>
  );
}

function WhatsappDisconnectedState({
  canManage,
  onConnect,
}: {
  canManage: boolean;
  onConnect: () => void;
}) {
  return (
    <section className="crm-whatsapp-disconnected">
      <span className="crm-whatsapp-disconnected-icon">
        <MessageCircle aria-hidden="true" />
      </span>
      <div>
        <strong>WhatsApp desconectado</strong>
        <h2>Conecte o numero da loja para abrir o atendimento.</h2>
        <p>
          As conversas e ferramentas de envio aparecem assim que a conexao
          estiver ativa.
        </p>
      </div>
      {canManage ? (
        <button className="crm-action" onClick={onConnect} type="button">
          <PlugZap aria-hidden="true" />
          Configurar conexao
        </button>
      ) : (
        <p>Solicite a um administrador da loja para configurar a conexao.</p>
      )}
    </section>
  );
}
