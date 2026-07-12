import {
  AlertTriangle,
  Check,
  Copy,
  RefreshCw,
  Webhook,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappWebhookEndpoint,
} from "./crmWhatsappTypes";

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
}: {
  connection: CrmWhatsappProviderConnection;
  isRefreshing: boolean;
  onRefresh: () => void;
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
    </section>
  );
}

export function ConnectionWebhookList({
  copiedType,
  endpoints,
  onCopy,
  tokenRequired,
}: {
  copiedType: string | null;
  endpoints: readonly CrmWhatsappWebhookEndpoint[];
  onCopy: (endpoint: CrmWhatsappWebhookEndpoint) => void;
  tokenRequired?: boolean;
}) {
  return (
    <ConnectionSectionCard
      className="crm-whatsapp-connection-webhooks-card"
      description={
        tokenRequired
          ? "Token obrigatorio via header x-crm-webhook-token ou query token."
          : "URLs geradas pelo backend para configurar na ZAPI."
      }
      icon={<Webhook aria-hidden="true" />}
      title="Webhooks"
    >
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
