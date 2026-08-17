import {
  ArrowRight,
  Camera,
  ExternalLink,
  MessageSquareText,
  PackageSearch,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import { createMarketplaceRuntimeApi } from "../marketplaces/runtimeApi";
import { getMarketplaceRequirementCopy } from "../marketplaces/marketplaceLabels";
import type { MarketplaceProviderState } from "../marketplaces/types";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  readOlxAuthorizationAction,
  readOlxChannelOperations,
} from "./crmChannelPresentation";
import { markCrmOlxOauthReturn } from "./crmOlxOauthReturn";
import { crmWhatsappSupportUrl } from "./crmWhatsappSupport";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
} from "./crmWhatsappTypes";

export function CrmWhatsappChannelDirectory({
  availableProviders,
  connections = [],
  marketplaceApi,
  onChoose,
  onRedirect = (url) => window.location.assign(url),
  zapiAddonContract,
}: {
  availableProviders: CrmWhatsappSetupProvider[];
  connections?: readonly CrmWhatsappProviderConnection[];
  marketplaceApi?: MarketplaceApi;
  onChoose: (provider: CrmWhatsappSetupProvider) => void;
  onRedirect?: (url: string) => void;
  zapiAddonContract: CrmWhatsappZapiAddonContract | null;
}) {
  const officialAvailable = availableProviders.includes("composio_whatsapp");
  const officialConfigured = connections.some(
    (connection) =>
      connection.provider === "composio_whatsapp" &&
      connection.status !== "archived",
  );
  const zapiConfigured = connections.some(
    (connection) =>
      connection.provider === "zapi" && connection.status !== "archived",
  );
  const api = useMemo(
    () => marketplaceApi ?? createMarketplaceRuntimeApi(),
    [marketplaceApi],
  );
  const [olxState, setOlxState] = useState<MarketplaceProviderState>();
  const [olxError, setOlxError] = useState<string | null>(null);
  const [olxOverviewLoaded, setOlxOverviewLoaded] = useState(false);
  const [olxOverviewUnavailable, setOlxOverviewUnavailable] = useState(false);
  const [olxLoading, setOlxLoading] = useState(false);
  const operations = readOlxChannelOperations(connections, olxState);
  const olxAction = olxOverviewLoaded
    ? readOlxAuthorizationAction(olxState, operations.chat)
    : null;

  useEffect(() => {
    let active = true;
    void api
      .getOverview()
      .then((overview) => {
        if (!active) return;
        setOlxOverviewLoaded(true);
        setOlxOverviewUnavailable(false);
        setOlxState(
          overview.providerStates.find((state) => state.provider === "olx"),
        );
      })
      .catch(() => {
        if (active) {
          setOlxOverviewLoaded(false);
          setOlxOverviewUnavailable(true);
          setOlxState(undefined);
        }
      });
    return () => {
      active = false;
    };
  }, [api]);

  const startOlxAuthorization = async () => {
    if (olxLoading) return;
    setOlxLoading(true);
    setOlxError(null);
    try {
      const result = await api.createConnectUrl({ provider: "olx" });
      markCrmOlxOauthReturn();
      onRedirect(result.authorizationUrl);
    } catch (caught) {
      setOlxError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível iniciar a autorização da OLX. Nenhuma conta foi conectada.",
        ),
      );
      setOlxLoading(false);
    }
  };
  return (
    <section aria-label="Canais" className="crm-channel-directory-shell">
      <ol
        aria-label="Canais conectados e disponíveis"
        className="crm-whatsapp-channel-directory"
      >
        {!availableProviders.length ? (
          <li className="crm-whatsapp-channel-empty">
            Os canais com configuração direta já estão conectados nesta loja.
          </li>
        ) : null}
        <li>
          <button
            className="crm-whatsapp-channel-row"
            data-actionable="true"
            onClick={() => onChoose("zapi")}
            type="button"
          >
            <span aria-hidden="true" className="crm-whatsapp-channel-icon">
              <QrCode />
            </span>
            <span className="crm-whatsapp-channel-body">
              <span className="crm-whatsapp-channel-title">
                Z-API
                {zapiConfigured ? (
                  <span
                    className="crm-whatsapp-channel-badge"
                    data-tone="muted"
                  >
                    Já conectado
                  </span>
                ) : (
                  <ChannelBadge contract={zapiAddonContract} />
                )}
              </span>
              <span className="crm-whatsapp-channel-description">
                {zapiConfigured
                  ? "Conexão ativa. Abra para revisar webhooks, desconectar ou trocar o aparelho."
                  : readZapiChooserDescription(zapiAddonContract)}
              </span>
              <ChannelIdentity
                broker="Credencial direta"
                channel="WhatsApp"
                transport="Z-API"
              />
            </span>
            <ArrowRight
              aria-hidden="true"
              className="crm-whatsapp-channel-chevron"
            />
          </button>
        </li>
        <li>
          <article className="crm-whatsapp-channel-row crm-channel-olx-card">
            <span aria-hidden="true" className="crm-whatsapp-channel-icon">
              <MessageSquareText />
            </span>
            <span className="crm-whatsapp-channel-body">
              <span className="crm-whatsapp-channel-title">
                OLX
                <span className="crm-whatsapp-channel-badge" data-tone="muted">
                  Marketplace oficial
                </span>
              </span>
              <span className="crm-whatsapp-channel-description">
                Uma autorização de conta, com confirmações independentes para
                atendimento e estoque.
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
              {olxOverviewUnavailable ? (
                <span className="crm-channel-indeterminate" role="status">
                  Não foi possível confirmar os escopos de Leads e Estoque da
                  OLX agora. O Chat mantém o estado observado na conexão do CRM.
                </span>
              ) : null}
              {olxError ? (
                <span className="crm-channel-oauth-error" role="alert">
                  {olxError}
                </span>
              ) : null}
            </span>
            {olxAction ? (
              <>
                <button
                  aria-describedby="crm-olx-oauth-note"
                  className="crm-channel-oauth-action"
                  disabled={olxLoading}
                  onClick={() => void startOlxAuthorization()}
                  type="button"
                >
                  {olxLoading ? "Iniciando…" : olxAction.label}
                  <ExternalLink aria-hidden="true" size={12} />
                </button>
                <span className="sr-only" id="crm-olx-oauth-note">
                  {olxAction.description} Nenhum anúncio é publicado
                  automaticamente.
                </span>
              </>
            ) : null}
          </article>
        </li>
        <li>
          {officialAvailable || officialConfigured ? (
            <button
              className="crm-whatsapp-channel-row"
              onClick={() => onChoose("composio_whatsapp")}
              type="button"
            >
              <span aria-hidden="true" className="crm-whatsapp-channel-icon">
                <ShieldCheck />
              </span>
              <span className="crm-whatsapp-channel-body">
                <span className="crm-whatsapp-channel-title">
                  WhatsApp Oficial
                  {officialConfigured ? (
                    <span
                      className="crm-whatsapp-channel-badge"
                      data-tone="muted"
                    >
                      Já conectado
                    </span>
                  ) : null}
                </span>
                <span className="crm-whatsapp-channel-description">
                  {officialConfigured
                    ? "Abra para revisar ou reautorizar a conexão oficial."
                    : "Autorize a conta Meta em uma página segura e escolha o número remetente."}
                </span>
                <ChannelIdentity
                  broker="Composio"
                  channel="WhatsApp"
                  transport="Meta Cloud"
                />
              </span>
              <ArrowRight
                aria-hidden="true"
                className="crm-whatsapp-channel-chevron"
              />
            </button>
          ) : (
            <div
              aria-disabled="true"
              className="crm-whatsapp-channel-row"
              data-actionable="false"
            >
              <span aria-hidden="true" className="crm-whatsapp-channel-icon">
                <ShieldCheck />
              </span>
              <span className="crm-whatsapp-channel-body">
                <span className="crm-whatsapp-channel-title">
                  WhatsApp Oficial
                  <span
                    className="crm-whatsapp-channel-badge"
                    data-tone="muted"
                  >
                    Indisponível
                  </span>
                </span>
                <span className="crm-whatsapp-channel-description">
                  A configuração oficial não está disponível para esta loja no
                  momento. Nenhuma operação oficial foi iniciada.
                </span>
                <ChannelIdentity
                  broker="Composio"
                  channel="WhatsApp"
                  transport="Meta Cloud"
                />
              </span>
            </div>
          )}
        </li>
        <li>
          <div
            className="crm-whatsapp-channel-row"
            data-actionable="false"
            data-variant="support"
          >
            <span aria-hidden="true" className="crm-whatsapp-channel-icon">
              <Camera />
            </span>
            <span className="crm-whatsapp-channel-body">
              <span className="crm-whatsapp-channel-title">
                Instagram incluído
                <span className="crm-whatsapp-channel-badge" data-tone="muted">
                  Com a equipe
                </span>
              </span>
              <span className="crm-whatsapp-channel-description">
                Sem custo adicional no CRM. A configuração é feita com ajuda da
                nossa equipe.
              </span>
              <ChannelIdentity
                broker="Composio"
                channel="Instagram"
                transport="Meta Cloud"
              />
            </span>
            <a
              className="crm-whatsapp-channel-support-link"
              href={crmWhatsappSupportUrl()}
              rel="noreferrer"
              target="_blank"
            >
              Pedir ajuda para configurar
              <ExternalLink aria-hidden="true" size={12} />
            </a>
          </div>
        </li>
      </ol>
    </section>
  );
}

function ChannelIdentity({
  broker,
  channel,
  transport,
}: {
  broker: string;
  channel: string;
  transport: string;
}) {
  return (
    <span className="crm-channel-identity">
      <span>
        <small>Canal</small>
        {channel}
      </span>
      <span>
        <small>Transporte</small>
        {transport}
      </span>
      <span>
        <small>Credencial</small>
        {broker}
      </span>
    </span>
  );
}

function ChannelOperation({
  icon,
  operation,
}: {
  icon?: ReactNode;
  operation: ReturnType<typeof readOlxChannelOperations>["chat"];
}) {
  return (
    <span className="crm-channel-operation" data-state={operation.state}>
      {icon}
      <span>
        <strong>
          {operation.label}
          <span className="crm-channel-operation-state">
            {readOperationStateLabel(operation.state)}
          </span>
        </strong>
        <small>{operation.detail}</small>
      </span>
    </span>
  );
}

function readOperationStateLabel(
  state: ReturnType<typeof readOlxChannelOperations>["chat"]["state"],
) {
  switch (state) {
    case "active":
      return "Ativo";
    case "degraded":
      return "Degradado";
    case "failed":
      return "Falhou";
    case "indeterminate":
      return "Indeterminado";
    case "not_connected":
      return "Não conectado";
    case "pending":
      return "Pendente";
  }
}

function ChannelBadge({
  contract,
}: {
  contract: CrmWhatsappZapiAddonContract | null;
}) {
  if (contract?.status === "active") {
    return (
      <span className="crm-whatsapp-channel-badge" data-tone="success">
        Adicional ativo
      </span>
    );
  }
  if (contract?.status === "pending") {
    return (
      <span className="crm-whatsapp-channel-badge">Pagamento pendente</span>
    );
  }
  if (contract?.status === "scheduled") {
    return (
      <span className="crm-whatsapp-channel-badge">Ativação agendada</span>
    );
  }
  if (contract?.status === "paid_awaiting_setup") {
    return <span className="crm-whatsapp-channel-badge">Em preparação</span>;
  }
  return (
    <span className="crm-whatsapp-channel-badge" data-tone="muted">
      Adicional opcional
    </span>
  );
}

function readZapiChooserDescription(
  contract: CrmWhatsappZapiAddonContract | null,
) {
  if (contract?.status === "pending") {
    return "Solicitação registrada; aguardando confirmação de pagamento.";
  }
  if (contract?.status === "scheduled") {
    return "Ativação programada para o próximo vencimento da assinatura.";
  }
  if (contract?.status === "paid_awaiting_setup") {
    return "Pagamento confirmado; a equipe está preparando a conexão.";
  }
  if (contract?.status === "active") {
    return "Adicional ativo. Informe as credenciais uma única vez para parear o telefone.";
  }
  return "Integração opcional paga. O valor e as condições vêm da assinatura da loja.";
}
