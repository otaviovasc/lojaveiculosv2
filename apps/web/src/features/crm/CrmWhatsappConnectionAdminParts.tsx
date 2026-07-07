import {
  Check,
  Copy,
  Hash,
  Phone,
  RefreshCw,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappWebhookEndpoint,
} from "./crmWhatsappTypes";

export function ConnectionSectionCard({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description?: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="crm-whatsapp-connection-card">
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
  return (
    <section className="crm-whatsapp-connection-status-card">
      <ShieldCheck aria-hidden="true" />
      <div>
        <strong>{readProviderStatus(connection)}</strong>
        <span>{readConnectionStatusDetail(connection)}</span>
      </div>
      <button
        aria-label="Atualizar status da conexao"
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

export function ConnectionOperationalSummary({
  connection,
}: {
  connection: CrmWhatsappProviderConnection;
}) {
  const rows = [
    {
      icon: <Phone aria-hidden="true" />,
      label: "Numero",
      value:
        connection.live.connectedPhone ??
        connection.metadata?.connectedPhone ??
        connection.phone ??
        "Nao informado",
    },
    {
      icon: <ShieldCheck aria-hidden="true" />,
      label: "Estado V2",
      value: readConfiguredStatus(connection.status),
    },
    {
      icon: <Hash aria-hidden="true" />,
      label: "Conexao",
      value: connection.displayName,
    },
    {
      icon: <Webhook aria-hidden="true" />,
      label: "Webhooks",
      value: connection.webhookTokenRequired
        ? "Token obrigatorio"
        : "Sem token local",
    },
  ];
  return (
    <ConnectionSectionCard
      description="Somente a instancia ZAPI e editavel. Tokens sao write-only e nunca sao exibidos depois de salvar."
      title="Resumo"
    >
      <dl className="crm-whatsapp-connection-summary">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>
              {row.icon}
              {row.label}
            </dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </ConnectionSectionCard>
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
      description={
        tokenRequired
          ? "Token obrigatorio via header x-crm-webhook-token ou query token."
          : "URLs geradas pelo backend para configurar na ZAPI."
      }
      icon={<Webhook aria-hidden="true" />}
      title="Webhooks"
    >
      <div className="crm-whatsapp-webhook-list">
        {endpoints.map((endpoint) => (
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
        ))}
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

function readConnectionStatusDetail(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "error") {
    return connection.live.errorMessage;
  }
  return (
    connection.live.connectedPhone ??
    connection.metadata?.connectedPhone ??
    connection.phone ??
    "Telefone nao informado"
  );
}

function readConfiguredStatus(status: CrmWhatsappProviderConnection["status"]) {
  const labels: Record<CrmWhatsappProviderConnection["status"], string> = {
    active: "Ativa",
    archived: "Arquivada",
    disconnected: "Desconectada",
    error: "Erro",
    paused: "Pausada",
    sandbox: "Sandbox",
  };
  return labels[status];
}
