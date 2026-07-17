import {
  AlertTriangle,
  Check,
  Copy,
  RefreshCw,
  Webhook,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappProviderConnection,
  CrmWhatsappWebhookEndpoint,
} from "./crmWhatsappTypes";

export type ConnectionWebhookAutoConfigState = {
  disabled?: boolean;
  isConfiguring: boolean;
  onConfigure: () => void;
  result: CrmWhatsappConfigureWebhooksResult | null;
};

export function ConnectionSectionCard({
  children,
  className = "",
  description,
  icon,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className={`crm-whatsapp-connection-card ${className}`.trim()}>
      <header>
        {icon ? <span>{icon}</span> : null}
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

export function ConnectionStatusCard({
  connection,
  isRefreshing,
  onRefresh,
  showRefresh = true,
}: {
  connection: CrmWhatsappProviderConnection;
  isRefreshing: boolean;
  onRefresh: () => void;
  showRefresh?: boolean;
}) {
  const statusTone = readProviderStatusTone(connection);
  return (
    <section
      className="crm-whatsapp-connection-status-card"
      data-status={statusTone}
    >
      <span className="crm-whatsapp-connection-status-icon">
        {statusTone === "connected" ? (
          <Wifi aria-hidden="true" />
        ) : statusTone === "error" ? (
          <AlertTriangle aria-hidden="true" />
        ) : (
          <WifiOff aria-hidden="true" />
        )}
      </span>
      <div>
        <span>WhatsApp (ZAPI)</span>
        <strong>{readProviderStatus(connection)}</strong>
        <small>{readConnectionStatusDetail(connection)}</small>
      </div>
      <span className="crm-whatsapp-connection-status-badge">
        {readProviderStatusBadge(connection)}
      </span>
      {showRefresh ? (
        <button
          aria-label="Atualizar status da conexão"
          className="crm-icon-action"
          disabled={isRefreshing}
          onClick={onRefresh}
          title="Atualizar status"
          type="button"
        >
          <RefreshCw aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

export function ConnectionWebhookAutoConfig({
  disabled = false,
  isConfiguring,
  onConfigure,
  result,
}: ConnectionWebhookAutoConfigState) {
  const failed = result?.results.filter((entry) => !entry.ok) ?? [];
  const succeeded = result?.results.filter((entry) => entry.ok) ?? [];
  return (
    <div className="crm-whatsapp-webhook-autoconfig">
      <button
        className="crm-whatsapp-connection-save"
        disabled={disabled || isConfiguring}
        onClick={onConfigure}
        type="button"
      >
        <Zap aria-hidden="true" />
        {isConfiguring
          ? "Configurando webhooks"
          : "Configurar webhooks na ZAPI"}
      </button>
      {result ? (
        <div
          className="crm-whatsapp-webhook-autoconfig-result"
          data-tone={failed.length ? "warning" : "success"}
          role="status"
        >
          {failed.length === 0 ? (
            <p className="crm-whatsapp-webhook-autoconfig-ok">
              <Check aria-hidden="true" />
              {succeeded.length} webhooks registrados na ZAPI automaticamente
              {result.tokenApplied ? " com token." : "."}
            </p>
          ) : (
            <>
              <p className="crm-whatsapp-webhook-autoconfig-warn">
                <AlertTriangle aria-hidden="true" />
                {failed.length} de {result.results.length} webhooks nao foram
                configurados.
              </p>
              <ul className="crm-whatsapp-webhook-autoconfig-errors">
                {failed.map((entry) => (
                  <li key={entry.type}>
                    <strong>{entry.type}</strong>:{" "}
                    {entry.error ?? "erro desconhecido"}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <p className="crm-whatsapp-connection-webhook-note">
          Registra as URLs abaixo direto na ZAPI usando o token do backend.
        </p>
      )}
    </div>
  );
}

export function ConnectionWebhookList({
  autoConfig,
  copiedType,
  embedded = false,
  endpoints,
  onCopy,
  tokenRequired,
}: {
  autoConfig?: ConnectionWebhookAutoConfigState;
  copiedType: string | null;
  embedded?: boolean;
  endpoints: readonly CrmWhatsappWebhookEndpoint[];
  onCopy: (endpoint: CrmWhatsappWebhookEndpoint) => void;
  tokenRequired?: boolean;
}) {
  const description = tokenRequired
    ? "Token obrigatorio via header x-crm-webhook-token ou query token."
    : "URLs geradas pelo backend para configurar na ZAPI.";
  const content = (
    <>
      {embedded ? (
        <p className="crm-whatsapp-connection-webhook-note">{description}</p>
      ) : null}
      {autoConfig ? <ConnectionWebhookAutoConfig {...autoConfig} /> : null}
      <div className="crm-whatsapp-webhook-list">
        {endpoints.length ? (
          endpoints.map((endpoint) => (
            <label className="crm-whatsapp-webhook-row" key={endpoint.type}>
              <span>{endpoint.label}</span>
              <input readOnly value={endpoint.url} />
              <button
                aria-label={`Copiar webhook ${endpoint.label}`}
                className="crm-icon-action"
                onClick={() => onCopy(endpoint)}
                title={`Copiar ${endpoint.label}`}
                type="button"
              >
                {copiedType === endpoint.type ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Copy aria-hidden="true" />
                )}
              </button>
            </label>
          ))
        ) : (
          <p className="crm-whatsapp-connection-empty">
            Nenhum webhook gerado para esta conexão.
          </p>
        )}
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <ConnectionSectionCard
      className="crm-whatsapp-connection-webhooks-card"
      description={description}
      icon={<Webhook aria-hidden="true" />}
      title="Webhooks"
    >
      {content}
    </ConnectionSectionCard>
  );
}

export function readProviderStatus(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "error") return "Erro na ZAPI";
  if (connection.live.providerStatus === "connected") return "ZAPI conectada";
  if (connection.live.providerStatus === "disconnected") return "Desconectada";
  return "Status desconhecido";
}

function readProviderStatusBadge(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "connected") return "Online";
  if (connection.live.providerStatus === "error") return "Erro";
  if (connection.live.providerStatus === "disconnected") return "Offline";
  return "Pendente";
}

function readProviderStatusTone(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "connected") return "connected";
  if (connection.live.providerStatus === "error") return "error";
  if (connection.live.providerStatus === "disconnected") return "disconnected";
  return "unknown";
}

function readConnectionStatusDetail(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "error") {
    return connection.live.errorMessage;
  }
  if (connection.live.providerStatus === "connected") {
    const phone =
      connection.live.connectedPhone ??
      connection.metadata?.connectedPhone ??
      connection.phone;
    return phone ? `Conectado - ${phone}` : "Conectado sem telefone informado";
  }
  if (connection.live.providerStatus === "disconnected") {
    return connection.externalInstanceId
      ? "Instancia configurada. Conecte o WhatsApp pelo QR Code da ZAPI."
      : "Informe o ID e o token da instancia ZAPI.";
  }
  return (
    connection.live.connectedPhone ??
    connection.metadata?.connectedPhone ??
    connection.phone ??
    "Status ainda nao verificado"
  );
}
