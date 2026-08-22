import { useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorDisplay, getApiErrorRecovery } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import type { ProductCrmApi } from "./productCrmApi";
import {
  createRuntimeCrmConversationApi,
  createRuntimeProductCrmApi,
} from "./runtimeApi";
import { createRuntimeCrmVisitsApi } from "./crmVisitsRuntimeApi";
import {
  prefetchCrmScopedData,
  CRM_EXTERNAL_BOT_CACHE_KEY,
  CRM_CAMPAIGNS_CACHE_KEY,
  CRM_VISITS_CACHE_KEY,
  crmScheduledMessagesCacheKey,
} from "./crmScopedCache";
import { useCrmInbox } from "./useCrmInbox";
import { CrmNotice } from "./CrmNotice";
import { CrmConnectionAdmin } from "./CrmConnectionAdmin";
import { CrmTagManager } from "./CrmTagManager";
import { readCrmConnectionStatus } from "./crmConnectionStatus";
import { totalUnreadCycles } from "./crmQueueState";
import {
  CrmScopedNav,
  type CrmConnectionTone,
  type CrmScope,
} from "./CrmScopedNav";
import { CrmConversationWorkspace } from "./CrmConversationWorkspace";
import {
  CrmCampaignsSection,
  CrmIntegrationsSection,
  CrmSchedulesSection,
} from "./CrmScopedSections";
import { CrmVisitsPage } from "./CrmVisitsPage";
import { MessageCircle, PlugZap } from "lucide-react";
import { readPendingComposioConnectionId } from "./crmComposioOAuth";
import { consumeCrmOlxOauthReturn } from "./crmOlxOauthReturn";
import { CrmStatsPage } from "./CrmStatsPage";
import { crmScopeHash, readCrmScopeFromHash } from "./crmRouteState";

export function CrmInbox({
  api,
  productApi,
}: {
  api?: CrmConversationApi;
  productApi?: ProductCrmApi;
}) {
  const conversationApi = useMemo(
    () => api ?? createRuntimeCrmConversationApi(),
    [api],
  );
  const leadApi = useMemo(
    () => productApi ?? createRuntimeProductCrmApi(),
    [productApi],
  );
  const visitsApi = useMemo(() => createRuntimeCrmVisitsApi(), []);
  const inbox = useCrmInbox(conversationApi);
  const [activeScope, setActiveScope] = useState<CrmScope>(() =>
    readPendingComposioConnectionId() || consumeCrmOlxOauthReturn()
      ? "connection"
      : readCrmScopeFromHash(window.location.hash),
  );
  const [visitedScopes, setVisitedScopes] = useState<ReadonlySet<CrmScope>>(
    () => new Set<CrmScope>([activeScope]),
  );
  const originalTitleRef = useRef(
    typeof document === "undefined" ? "CRM" : document.title,
  );
  const unreadCount = totalUnreadCycles(inbox.conversationCycles);
  const providerStatus = readCrmConnectionStatus({
    hasConnection: inbox.hasConnection,
    isLoading: inbox.connectionIsLoading,
    connectionError: inbox.connectionError,
  });
  const status = readSynchronizedChannelStatus(
    providerStatus,
    inbox.realtimeStatus,
  );
  const errorRecovery = getApiErrorRecovery(inbox.error);
  const errorDisplay = getApiErrorDisplay(
    inbox.error,
    "Não foi possível carregar o WhatsApp.",
  );

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
        prefetchCrmScopedData(conversationApi, CRM_CAMPAIGNS_CACHE_KEY, () =>
          conversationApi.listCampaigns({ limit: 50 }),
        );
      }
      if (permissions.canScheduleRead) {
        prefetchCrmScopedData(
          conversationApi,
          crmScheduledMessagesCacheKey(connectionId),
          () =>
            conversationApi.listScheduledMessages({
              limit: 100,
              ...(connectionId ? { connectionId } : {}),
            }),
        );
      }
      if (permissions.canIntegrationsManage) {
        prefetchCrmScopedData(
          conversationApi,
          CRM_EXTERNAL_BOT_CACHE_KEY,
          async () => (await conversationApi.getBotIntegration()).configuration,
        );
      }
      if (permissions.canVisitsRead) {
        prefetchCrmScopedData(visitsApi, CRM_VISITS_CACHE_KEY, () =>
          visitsApi.listVisits({ limit: 100 }),
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [connectionId, inboxIsLoading, permissions, visitsApi, conversationApi]);

  const scopePanelClassName = (scope: CrmScope) =>
    activeScope === scope ? "flex-1 flex flex-col min-h-0" : "hidden";

  return (
    <main className="crm-page">
      {inbox.error ? (
        <CrmNotice
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
          message={errorDisplay.message}
          {...(errorDisplay.requestId
            ? { requestId: errorDisplay.requestId }
            : {})}
        />
      ) : null}
      {!inbox.permissions.canList ? (
        <CrmNotice message="Seu usuario nao tem permissao para visualizar o WhatsApp CRM." />
      ) : null}
      {inbox.permissions.canList ? (
        <>
          <CrmScopedNav
            activeScope={activeScope}
            connectionLabel={status.label}
            connectionTone={status.tone}
            onChange={(scope) => {
              setActiveScope(scope);
              window.history.replaceState(null, "", `#${crmScopeHash(scope)}`);
            }}
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
                  <CrmDisconnectedState
                    canManage={inbox.permissions.canConnectionSetup}
                    onConnect={() => setActiveScope("connection")}
                  />
                ) : (
                  <CrmConversationWorkspace
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
                <section className="crm-section">
                  <CrmConnectionAdmin
                    canManageRouting={inbox.permissions.canRoutingDefaultManage}
                    connections={inbox.connections}
                    disabled={!inbox.permissions.canConnectionPair}
                    embedded
                    onClose={() => setActiveScope("conversations")}
                    onRefresh={inbox.refreshConnections}
                    onRoutingPolicyChange={inbox.refreshRoutingPolicy}
                    routingApi={conversationApi}
                    selfService={{
                      allowance: inbox.connectionAllowance,
                      availableSetups: inbox.availableConnectionSetups,
                      canPair: inbox.permissions.canConnectionPair,
                      canSetup: inbox.permissions.canConnectionSetup,
                      handlers: {
                        onAuthorizeComposio: inbox.authorizeComposioConnection,
                        onCompleteComposio: async (connectionId) => {
                          const result =
                            await inbox.completeComposioConnection(
                              connectionId,
                            );
                          await inbox.refreshRoutingPolicy();
                          return result;
                        },
                        onConfigureZapiWebhooks: async (connectionId) => {
                          const result =
                            await inbox.configureZapiWebhooks(connectionId);
                          await inbox.refreshRoutingPolicy();
                          return result;
                        },
                        onCreate: async (input) => {
                          const result = await inbox.createConnection(input);
                          await inbox.refreshRoutingPolicy();
                          return result;
                        },
                        onDisconnectZapi: inbox.disconnectZapiConnection,
                        onRefreshConnections: inbox.refreshConnections,
                        onRequestZapiPairingCode: inbox.requestZapiPairingCode,
                        onRequestZapiPairingQr: inbox.requestZapiPairingQr,
                        onRequestZapiAddon: inbox.requestZapiAddon,
                        onRefreshZapiStatus: async (connectionId) => {
                          const result =
                            await inbox.refreshZapiConnectionStatus(
                              connectionId,
                            );
                          await inbox.refreshRoutingPolicy();
                          return result;
                        },
                        onSelectComposioSender: async (
                          connectionId,
                          sender,
                        ) => {
                          const result =
                            await inbox.selectComposioConnectionSender(
                              connectionId,
                              sender,
                            );
                          await inbox.refreshRoutingPolicy();
                          return result;
                        },
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
                <CrmCampaignsSection
                  api={conversationApi}
                  inbox={inbox}
                  leadApi={leadApi}
                />
              </div>
            ) : null}
            {visitedScopes.has("schedules") ? (
              <div className={scopePanelClassName("schedules")} key="schedules">
                <CrmSchedulesSection api={conversationApi} inbox={inbox} />
              </div>
            ) : null}
            {visitedScopes.has("integrations") ? (
              <div
                className={scopePanelClassName("integrations")}
                key="integrations"
              >
                <CrmIntegrationsSection
                  api={conversationApi}
                  canManage={inbox.permissions.canIntegrationsManage}
                  canRead={inbox.permissions.canRead}
                  canRetry={inbox.permissions.canSend}
                />
              </div>
            ) : null}
            {visitedScopes.has("tags") ? (
              <div className={scopePanelClassName("tags")} key="tags">
                <section className="crm-section">
                  <CrmTagManager
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
                <CrmVisitsPage
                  activeSession={inbox.activeSession}
                  api={visitsApi}
                  canManage={inbox.permissions.canVisitsManage}
                  canRead={inbox.permissions.canVisitsRead}
                  listVehicles={inbox.listVehicles}
                />
              </div>
            ) : null}
            {visitedScopes.has("statistics") ? (
              <div
                className={scopePanelClassName("statistics")}
                key="statistics"
              >
                <CrmStatsPage
                  api={conversationApi}
                  canRead={inbox.permissions.canList}
                  connections={inbox.connections}
                />
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </main>
  );
}

export function readSynchronizedChannelStatus(
  providerStatus: { label: string; tone: CrmConnectionTone },
  realtimeStatus: "connected" | "connecting" | "degraded" | "offline",
) {
  if (providerStatus.tone !== "online") return providerStatus;
  if (realtimeStatus === "connected") {
    return { label: "Sincronizado", tone: "online" as const };
  }
  if (realtimeStatus === "connecting") {
    return { label: "Reconciliando", tone: "loading" as const };
  }
  return {
    label:
      realtimeStatus === "degraded"
        ? "Sincronização indisponível"
        : "Rede indisponível",
    tone: "error" as const,
  };
}

function CrmDisconnectedState({
  canManage,
  onConnect,
}: {
  canManage: boolean;
  onConnect: () => void;
}) {
  return (
    <section className="crm-disconnected">
      <span className="crm-disconnected-icon">
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
