import { Check, Copy, RefreshCw, ShieldCheck, Webhook } from "lucide-react";
import type { ReactNode } from "react";
import type {
  CrmWhatsappConnectionConfiguredStatus,
  CrmWhatsappProviderConnection,
  CrmWhatsappUpdateConnectionInput,
  CrmWhatsappWebhookEndpoint,
} from "./crmWhatsappTypes";

export type ConnectionDraft = {
  apiBaseUrlEnv: string;
  catalogPhone: string;
  clientTokenEnv: string;
  connectedPhone: string;
  displayName: string;
  externalConnectionId: string;
  externalInstanceId: string;
  instanceIdEnv: string;
  instanceTokenEnv: string;
  phone: string;
  purpose: string;
  status: CrmWhatsappConnectionConfiguredStatus;
  webhookUrl: string;
};

export const statusOptions: CrmWhatsappConnectionConfiguredStatus[] = [
  "active",
  "sandbox",
  "paused",
  "disconnected",
  "error",
  "archived",
];

export function TextField({
  disabled,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label>
      {label}
      <input
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function createConnectionDraft(
  connection: CrmWhatsappProviderConnection | null,
): ConnectionDraft {
  return {
    apiBaseUrlEnv: connection?.credentials?.apiBaseUrlEnv ?? "",
    catalogPhone: connection?.metadata?.catalogPhone ?? "",
    clientTokenEnv: connection?.credentials?.clientTokenEnv ?? "",
    connectedPhone: connection?.metadata?.connectedPhone ?? "",
    displayName: connection?.displayName ?? "",
    externalConnectionId: connection?.externalConnectionId ?? "",
    externalInstanceId: connection?.externalInstanceId ?? "",
    instanceIdEnv: connection?.credentials?.instanceIdEnv ?? "",
    instanceTokenEnv: connection?.credentials?.instanceTokenEnv ?? "",
    phone: connection?.phone ?? "",
    purpose: connection?.metadata?.purpose ?? "",
    status: connection?.status ?? "active",
    webhookUrl: connection?.webhookUrl ?? "",
  };
}

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
  disabled,
  isRefreshing,
  onRefresh,
}: {
  connection: CrmWhatsappProviderConnection;
  disabled?: boolean;
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
        disabled={disabled || isRefreshing}
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

export function toConnectionUpdateInput(
  draft: ConnectionDraft,
): CrmWhatsappUpdateConnectionInput | null {
  const credentialValues = [
    draft.apiBaseUrlEnv,
    draft.clientTokenEnv,
    draft.instanceIdEnv,
    draft.instanceTokenEnv,
  ].map((value) => value.trim());
  const hasAnyCredential = credentialValues.some(Boolean);
  if (hasAnyCredential && !credentialValues.every(Boolean)) return null;
  return {
    catalogPhone: nullable(draft.catalogPhone),
    connectedPhone: nullable(draft.connectedPhone),
    ...(hasAnyCredential
      ? {
          credentialsEnv: {
            apiBaseUrl: credentialValues[0]!,
            clientToken: credentialValues[1]!,
            instanceId: credentialValues[2]!,
            instanceToken: credentialValues[3]!,
          },
        }
      : {}),
    displayName: draft.displayName.trim(),
    externalConnectionId: nullable(draft.externalConnectionId),
    externalInstanceId: nullable(draft.externalInstanceId),
    phone: nullable(draft.phone),
    purpose: nullable(draft.purpose),
    status: draft.status,
    webhookUrl: nullable(draft.webhookUrl),
  };
}

function nullable(value: string) {
  return value.trim() || null;
}
