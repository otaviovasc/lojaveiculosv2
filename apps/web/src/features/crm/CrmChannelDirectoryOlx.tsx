import {
  ExternalLink,
  Loader2,
  MessageSquareText,
  PackageSearch,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import { createMarketplaceRuntimeApi } from "../marketplaces/runtimeApi";
import { getMarketplaceRequirementCopy } from "../marketplaces/marketplaceLabels";
import type { MarketplaceProviderState } from "../marketplaces/types";
import {
  readOlxAuthorizationAction,
  readOlxChannelOperations,
  readOlxChatRetryTarget,
  type CrmChannelOperation,
} from "./crmChannelPresentation";
import { markCrmOlxOauthReturn } from "./crmOlxOauthReturn";
import type { CrmConversationApi } from "./crmConversationApi";
import { createRuntimeCrmConversationApi } from "./runtimeApi";
import { ChannelIdentity } from "./CrmChannelDirectoryParts";
import { OlxLogo } from "./CrmChannelLogos";
import type { CrmProviderConnection } from "./crmConversationTypes";

const operationStateLabels: Record<CrmChannelOperation["state"], string> = {
  active: "Ativo",
  degraded: "Degradado",
  failed: "Falhou",
  indeterminate: "Indeterminado",
  not_connected: "Não conectado",
  pending: "Pendente",
};

export function CrmOlxChannelCard({
  connections,
  crmApi,
  marketplaceApi,
  onConnectionsChanged,
  onRedirect = (url) => window.location.assign(url),
  showActions = true,
}: {
  connections: readonly CrmProviderConnection[];
  crmApi?: Pick<CrmConversationApi, "retryOlxChatSetup">;
  marketplaceApi?: MarketplaceApi;
  onConnectionsChanged?: () => Promise<void> | void;
  onRedirect?: (url: string) => void;
  showActions?: boolean;
}) {
  const api = useMemo(
    () => marketplaceApi ?? createMarketplaceRuntimeApi(),
    [marketplaceApi],
  );
  const crm = useMemo(
    () => crmApi ?? createRuntimeCrmConversationApi(),
    [crmApi],
  );
  const [olxState, setOlxState] = useState<MarketplaceProviderState>();
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [overviewLoaded, setOverviewLoaded] = useState(false);
  const [overviewUnavailable, setOverviewUnavailable] = useState(false);
  const [overviewRetryBusy, setOverviewRetryBusy] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  const operations = readOlxChannelOperations(connections, olxState);
  const retryTarget = overviewLoaded
    ? readOlxChatRetryTarget(connections, olxState)
    : null;
  const nonChatCapabilityNeedsReauth = (["leads", "stock"] as const).some(
    (key) => {
      const reason = olxState?.capabilities?.[key]?.reason;
      return (
        reason === "missing_scope" ||
        reason === "provider_rejected" ||
        reason === "runtime_unavailable"
      );
    },
  );
  const olxAction = overviewLoaded
    ? readOlxAuthorizationAction(olxState, operations.chat)
    : null;
  // A retryable provider-internal Chat failure must not trigger a new OAuth
  // authorization; only surface OAuth when another projection needs it.
  const showOlxAction =
    olxAction &&
    (!retryTarget ||
      olxAction.label !== "Reconfigurar OLX" ||
      nonChatCapabilityNeedsReauth);

  const reloadOverview = useCallback(async () => {
    const overview = await api.getOverview();
    setOverviewLoaded(true);
    setOverviewUnavailable(false);
    setOlxState(
      overview.providerStates.find((state) => state.provider === "olx"),
    );
  }, [api]);

  const retryOverview = async () => {
    if (overviewRetryBusy) return;
    setOverviewRetryBusy(true);
    try {
      await reloadOverview();
    } catch {
      setOverviewLoaded(false);
      setOverviewUnavailable(true);
      setOlxState(undefined);
    } finally {
      setOverviewRetryBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    void api
      .getOverview()
      .then((overview) => {
        if (!active) return;
        setOverviewLoaded(true);
        setOverviewUnavailable(false);
        setOlxState(
          overview.providerStates.find((state) => state.provider === "olx"),
        );
      })
      .catch(() => {
        if (active) {
          setOverviewLoaded(false);
          setOverviewUnavailable(true);
          setOlxState(undefined);
        }
      });
    return () => {
      active = false;
    };
  }, [api]);

  const startOlxAuthorization = async () => {
    if (oauthLoading) return;
    setOauthLoading(true);
    setOauthError(null);
    try {
      const result = await api.createConnectUrl({ provider: "olx" });
      markCrmOlxOauthReturn();
      onRedirect(result.authorizationUrl);
    } catch (caught) {
      setOauthError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível iniciar a autorização da OLX. Nenhuma conta foi conectada.",
        ),
      );
      setOauthLoading(false);
    }
  };

  const retryChatSetup = async (connectionId: string) => {
    if (retryBusy) return;
    setRetryBusy(true);
    setRetryError(null);
    setRetryNotice(null);
    try {
      const result = await crm.retryOlxChatSetup(connectionId);
      await onConnectionsChanged?.();
      await reloadOverview().catch(() => undefined);
      setRetryNotice(
        result.readiness.ready
          ? "A configuração foi confirmada pelo servidor. O OLX Chat está pronto para uso no CRM."
          : "A nova tentativa foi concluída, mas o servidor ainda não confirmou que o OLX Chat está pronto.",
      );
    } catch (caught) {
      setRetryError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível ativar o OLX Chat agora. Nenhuma alteração foi confirmada.",
        ),
      );
    } finally {
      setRetryBusy(false);
    }
  };

  return (
    <article
      className="crm-channel-row crm-channel-olx-card"
      data-channel="olx"
      data-provider="olx"
    >
      <span aria-hidden="true" className="crm-channel-card-watermark">
        <OlxLogo />
      </span>
      <span aria-hidden="true" className="crm-channel-icon">
        <OlxLogo />
      </span>
      <span className="crm-channel-body">
        <span className="crm-channel-title">
          <strong>OLX</strong>
          <span className="crm-channel-badge" data-tone="muted">
            Marketplace oficial
          </span>
        </span>
        <span className="crm-channel-description">
          Uma autorização de conta, com confirmações independentes para Chat,
          Leads e Estoque.
        </span>
        <ChannelIdentity
          broker="Credencial direta"
          channel="OLX Chat"
          transport="OLX"
        />
        <span className="crm-channel-operation-grid">
          <ChannelOperation operation={operations.chat} />
          <ChannelOperation operation={operations.leads} />
          <ChannelOperation
            icon={<PackageSearch aria-hidden="true" />}
            operation={operations.stock}
          />
        </span>
        {olxState?.requirements.length ? (
          <span className="crm-channel-scope-list" role="note">
            <strong>Escopos ou requisitos pendentes</strong>
            {olxState.requirements.map((requirement) => (
              <span key={requirement.code}>
                {getMarketplaceRequirementCopy(requirement)?.message ??
                  "A conta OLX precisa de atenção."}
              </span>
            ))}
          </span>
        ) : null}
        {overviewUnavailable ? (
          <span className="crm-channel-indeterminate" role="status">
            <span>
              Não foi possível confirmar os escopos de Leads e Estoque da OLX
              agora. O Chat mantém o estado observado na conexão do CRM.
            </span>
            <button
              className="crm-channel-overview-retry"
              disabled={overviewRetryBusy}
              onClick={() => void retryOverview()}
              type="button"
            >
              {overviewRetryBusy
                ? "Consultando…"
                : "Tentar consultar novamente"}
            </button>
          </span>
        ) : null}
        {retryNotice ? (
          <span className="crm-channel-retry-notice" role="status">
            {retryNotice}
          </span>
        ) : null}
        {retryError ? (
          <span className="crm-channel-oauth-error" role="alert">
            {retryError}
          </span>
        ) : null}
        {oauthError ? (
          <span className="crm-channel-oauth-error" role="alert">
            {oauthError}
          </span>
        ) : null}
      </span>
      {showActions ? (
        <span className="crm-channel-oauth-actions">
          {retryTarget ? (
            <button
              className="crm-channel-oauth-action"
              disabled={retryBusy}
              onClick={() => void retryChatSetup(retryTarget.connectionId)}
              type="button"
            >
              {retryBusy ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={12}
                />
              ) : null}
              {retryBusy ? "Ativando…" : "Tentar ativar Chat novamente"}
            </button>
          ) : null}
          {olxAction && showOlxAction ? (
            <>
              <button
                aria-describedby="crm-olx-oauth-note"
                className="crm-channel-oauth-action"
                disabled={oauthLoading}
                onClick={() => void startOlxAuthorization()}
                type="button"
              >
                {oauthLoading ? "Iniciando…" : olxAction.label}
                <ExternalLink aria-hidden="true" size={12} />
              </button>
              <span className="sr-only" id="crm-olx-oauth-note">
                {olxAction.description} Nenhum anúncio é publicado
                automaticamente.
              </span>
            </>
          ) : null}
        </span>
      ) : null}
    </article>
  );
}

function ChannelOperation({
  icon,
  operation,
}: {
  icon?: ReactNode;
  operation: CrmChannelOperation;
}) {
  return (
    <span className="crm-channel-operation" data-state={operation.state}>
      {icon}
      <span>
        <strong>
          {operation.label}
          <span className="crm-channel-operation-state">
            {operationStateLabels[operation.state]}
          </span>
        </strong>
        <small>{operation.detail}</small>
      </span>
    </span>
  );
}
