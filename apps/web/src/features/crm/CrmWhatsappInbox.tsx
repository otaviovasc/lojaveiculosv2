import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatApiErrorDisplay,
  getApiErrorRecovery,
} from "../../lib/apiErrors";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { ProductCrmApi } from "./productCrmApi";
import {
  createRuntimeCrmWhatsappApi,
  createRuntimeProductCrmApi,
} from "./runtimeApi";
import { createRuntimeCrmVisitsApi } from "./crmVisitsRuntimeApi";
import {
  prefetchWhatsappScopedData,
  WHATSAPP_BOT_INTEGRATION_CACHE_KEY,
  WHATSAPP_CAMPAIGNS_CACHE_KEY,
  WHATSAPP_VISITS_CACHE_KEY,
  whatsappScheduledMessagesCacheKey,
} from "./crmWhatsappScopedCache";
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
import { readPendingComposioConnectionId } from "./crmWhatsappComposioOAuth";
import { CrmWhatsappRealtimeBanner } from "./CrmWhatsappRealtimeBanner";

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
  const visitsApi = useMemo(() => createRuntimeCrmVisitsApi(), []);
  const inbox = useCrmWhatsappInbox(whatsappApi);
  const [activeScope, setActiveScope] = useState<CrmWhatsappScope>(() =>
    readPendingComposioConnectionId() ? "connection" : "conversations",
  );
  const [visitedScopes, setVisitedScopes] = useState<
    ReadonlySet<CrmWhatsappScope>
  >(() => new Set<CrmWhatsappScope>([activeScope]));
  const originalTitleRef = useRef(
    typeof document === "undefined" ? "CRM" : document.title,
  );
  const unreadCount = totalUnreadSessions(inbox.sessions);
  const status = readWhatsappStatus({
    hasConnection: inbox.hasConnection,
    isLoading: inbox.connectionIsLoading,
    connectionError: inbox.connectionError,
  });
  const errorRecovery = getApiErrorRecovery(inbox.error);

  useEffect(() => {
    setVisitedScopes((current) =>
      current.has(activeScope) ? current : new Set(current).add(activeScope),
    );
  }, [activeScope]);

  useEffect(() => {
    document.title = unreadCount
      ? `(${unreadCount}) Nova mensagem - CRM`
      : originalTitleRef.current;
  }, [unreadCount]);

  // Warm the other scopes' list data shortly after the primary inbox load, so
  // the first visit to each tab renders cached content instead of a loading
  // state. Sections still refetch on mount and update in the background.
  const { connectionId, isLoading: inboxIsLoading, permissions } = inbox;
  useEffect(() => {
    if (inboxIsLoading || !permissions.canList) return undefined;
    const timer = setTimeout(() => {
      if (permissions.canCampaignRead) {
        prefetchWhatsappScopedData(
          whatsappApi,
          WHATSAPP_CAMPAIGNS_CACHE_KEY,
          () => whatsappApi.listCampaigns({ limit: 50 }),
        );
      }
      if (permissions.canScheduleRead) {
        prefetchWhatsappScopedData(
          whatsappApi,
          whatsappScheduledMessagesCacheKey(connectionId),
          () =>
            whatsappApi.listScheduledMessages({
              limit: 100,
              ...(connectionId ? { connectionId } : {}),
            }),
        );
      }
      if (permissions.canIntegrationsManage) {
        prefetchWhatsappScopedData(
          whatsappApi,
          WHATSAPP_BOT_INTEGRATION_CACHE_KEY,
          async () => (await whatsappApi.getBotIntegration()).integration,
        );
      }
      if (permissions.canVisitsRead) {
        prefetchWhatsappScopedData(visitsApi, WHATSAPP_VISITS_CACHE_KEY, () =>
          visitsApi.listVisits({ limit: 100 }),
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [connectionId, inboxIsLoading, permissions, visitsApi, whatsappApi]);

  const scopePanelClassName = (scope: CrmWhatsappScope) =>
    activeScope === scope ? "flex-1 flex flex-col min-h-0" : "hidden";

  return (
    <main className="crm-whatsapp-page">
      {inbox.error ? (
        <WhatsappNotice
          {...(errorRecovery
            ? {
                actionLabel:
                  errorRecovery.kind === "retry" &&
                  !inbox.hasRetryableSessionAction
                    ? "Atualizar e verificar"
                    : errorRecovery.label,
                onAction: () => {
                  if (errorRecovery.kind === "configure") {
                    setActiveScope("connection");
                    return;
                  }
                  if (
                    errorRecovery.kind === "retry" &&
                    inbox.hasRetryableSessionAction
                  ) {
                    void inbox.retryLastSessionAction();
                    return;
                  }
                  void inbox.refreshSessions();
                },
              }
            : {})}
          message={formatApiErrorDisplay(
            inbox.error,
            "Não foi possível carregar o WhatsApp.",
          )}
        />
      ) : null}
      {inbox.permissions.canList && inbox.hasConnection ? (
        <CrmWhatsappRealtimeBanner
          hasCachedInbox={inbox.sessions.length > 0}
          status={inbox.realtimeStatus}
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
          <div className="crm-tab-panel flex-1 flex flex-col min-h-0">
            {visitedScopes.has("conversations") ? (
              <div
                className={scopePanelClassName("conversations")}
                key="conversations"
              >
                {inbox.hasConnection === false ? (
                  <WhatsappDisconnectedState
                    canManage={inbox.permissions.canConnectionSetup}
                    onConnect={() => setActiveScope("connection")}
                  />
                ) : (
                  <CrmWhatsappConversationWorkspace
                    inbox={inbox}
                    onScopeChange={setActiveScope}
                  />
                )}
              </div>
            ) : null}
            {visitedScopes.has("connection") ? (
              <div
                className={scopePanelClassName("connection")}
                key="connection"
              >
                <section className="crm-whatsapp-section">
                  <CrmWhatsappConnectionAdmin
                    connections={inbox.connections}
                    disabled={!inbox.permissions.canConnectionPair}
                    embedded
                    onClose={() => setActiveScope("conversations")}
                    onRefresh={inbox.refreshConnections}
                    selfService={{
                      allowance: inbox.connectionAllowance,
                      availableProviders: inbox.availableConnectionProviders,
                      canPair: inbox.permissions.canConnectionPair,
                      canSetup: inbox.permissions.canConnectionSetup,
                      handlers: {
                        onAuthorizeComposio: inbox.authorizeComposioConnection,
                        onCompleteComposio: inbox.completeComposioConnection,
                        onConfigureZapiWebhooks: inbox.configureZapiWebhooks,
                        onCreate: inbox.createConnection,
                        onDisconnectZapi: inbox.disconnectZapiConnection,
                        onRefreshConnections: inbox.refreshConnections,
                        onRequestZapiPairingCode: inbox.requestZapiPairingCode,
                        onRequestZapiPairingQr: inbox.requestZapiPairingQr,
                        onRequestZapiAddon: inbox.requestZapiAddon,
                        onRefreshZapiStatus: inbox.refreshZapiConnectionStatus,
                        onSelectComposioSender:
                          inbox.selectComposioConnectionSender,
                        onSetConnectionPaused: inbox.setConnectionPaused,
                      },
                      zapiAddonContract: inbox.zapiAddonContract,
                    }}
                  />
                </section>
              </div>
            ) : null}
            {visitedScopes.has("campaigns") ? (
              <div className={scopePanelClassName("campaigns")} key="campaigns">
                <WhatsappCampaignsSection
                  api={whatsappApi}
                  inbox={inbox}
                  leadApi={leadApi}
                />
              </div>
            ) : null}
            {visitedScopes.has("schedules") ? (
              <div className={scopePanelClassName("schedules")} key="schedules">
                <WhatsappSchedulesSection api={whatsappApi} inbox={inbox} />
              </div>
            ) : null}
            {visitedScopes.has("integrations") ? (
              <div
                className={scopePanelClassName("integrations")}
                key="integrations"
              >
                <WhatsappIntegrationsSection
                  api={whatsappApi}
                  canManage={inbox.permissions.canIntegrationsManage}
                  canRead={inbox.permissions.canRead}
                  canRetry={inbox.permissions.canSend}
                />
              </div>
            ) : null}
            {visitedScopes.has("tags") ? (
              <div className={scopePanelClassName("tags")} key="tags">
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
              </div>
            ) : null}
            {visitedScopes.has("visits") ? (
              <div className={scopePanelClassName("visits")} key="visits">
                <CrmWhatsappVisitsPage
                  activeSession={inbox.activeSession}
                  api={visitsApi}
                  canManage={inbox.permissions.canVisitsManage}
                  canRead={inbox.permissions.canVisitsRead}
                  listVehicles={inbox.listVehicles}
                />
              </div>
            ) : null}
          </div>
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
        <h2>Conecte o número da loja para abrir o atendimento.</h2>
        <p>
          As conversas e ferramentas de envio aparecem assim que a conexão
          estiver ativa.
        </p>
      </div>
      {canManage ? (
        <button className="crm-action" onClick={onConnect} type="button">
          <PlugZap aria-hidden="true" />
          Configurar conexão
        </button>
      ) : (
        <p>Solicite a um administrador da loja para configurar a conexão.</p>
      )}
    </section>
  );
}
