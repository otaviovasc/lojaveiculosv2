import type {
  CrmWhatsappConnectionConfiguredStatus,
  CrmWhatsappProviderConnection,
  CrmWhatsappUpdateConnectionInput,
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

export function readProviderStatus(connection: CrmWhatsappProviderConnection) {
  if (connection.live.providerStatus === "error") return "Erro na ZAPI";
  if (connection.live.providerStatus === "connected") return "ZAPI conectada";
  if (connection.live.providerStatus === "disconnected") return "Desconectada";
  return "Status desconhecido";
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
