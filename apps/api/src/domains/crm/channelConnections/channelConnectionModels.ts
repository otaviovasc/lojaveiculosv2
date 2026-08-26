import type {
  CrmConnection,
  CrmConnectionConfiguredStatus,
} from "../ports/crmConnectionRepository.js";
import {
  crmChannelConnectionSchema,
  type CrmChannelConnectionDto,
} from "@lojaveiculosv2/shared";
import type { CrmCredentialBroker } from "../core/models.js";
import type { CrmMessagingProviderStatus } from "../ports/crmMessagingGateway.js";
import {
  readZapiWebhookSetupState,
  type ZapiWebhookSetupState,
} from "../whatsapp/zapiWebhookSetupState.js";

export type CrmChannelConnectionLiveStatus =
  | (CrmMessagingProviderStatus & {
      providerStatus: "connected" | "disconnected" | "unknown";
    })
  | {
      checkedAt: Date;
      connected: null;
      connectedPhone: null;
      errorMessage: string;
      providerStatus: "error";
      smartphoneConnected: null;
    };

export type CrmChannelConnection = CrmChannelConnectionDto & {
  /** Canonical multi-channel fields. Legacy setup fields below remain adapter-owned. */
  broker: CrmCredentialBroker;
  credentials: CrmChannelConnectionCredentialRefs;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  live: CrmChannelConnectionLiveStatus;
  metadata: CrmChannelConnectionMetadata;
  phone: string | null;
  ready: boolean;
  routingStatus: "ready" | "preserved" | "deferred";
  setup: ZapiWebhookSetupState | null;
  status: CrmConnectionConfiguredStatus;
};

export type CrmChannelConnectionCredentialRefs = {
  apiBaseUrlEnv: string | null;
  apiKeyEnv: string | null;
  clientTokenEnv: string | null;
  composioConnectedAccountConfigured: boolean;
  instanceIdEnv: string | null;
  instanceTokenEnv: string | null;
  mode: string | null;
  storedInstanceConfigured: boolean;
};

export type CrmChannelConnectionMetadata = {
  catalogPhone: string | null;
  connectedPhone: string | null;
  migrationUnit: string | null;
  purpose: string | null;
};

export function toCrmChannelConnection(
  connection: CrmConnection,
  live: CrmChannelConnectionLiveStatus,
): CrmChannelConnection {
  const canonical = connection.canonical;
  if (!canonical) {
    throw new Error("Canonical CRM channel connection projection is missing.");
  }
  const setup =
    connection.provider === "zapi"
      ? readZapiWebhookSetupState(connection.metadata)
      : null;
  const canonicalDto = crmChannelConnectionSchema.parse({
    capabilities: canonical.capabilities,
    channel: canonical.channel,
    displayName: connection.displayName,
    id: connection.id,
    isDefault: false,
    provider: canonical.provider,
    ...(connection.revision !== undefined
      ? { revision: connection.revision }
      : {}),
    readiness: canonical.readiness,
    state: canonical.state,
  });
  return {
    broker: canonical.broker,
    ...canonicalDto,
    credentials: readCredentialRefs(connection.credentialsRef),
    externalConnectionId: connection.externalConnectionId,
    externalInstanceId: connection.externalInstanceId,
    live,
    metadata: readConnectionMetadata(connection.metadata),
    phone: connection.phone,
    ready: canonical.readiness.ready,
    routingStatus: readRoutingStatus(connection.metadata),
    setup,
    status: connection.status,
  };
}

function readRoutingStatus(metadata: Record<string, unknown>) {
  const status = metadata.routingStatus;
  return status === "ready" || status === "preserved" || status === "deferred"
    ? status
    : "preserved";
}

export function setupProviderForConnection(
  connection: Pick<CrmChannelConnection, "broker" | "channel" | "provider">,
): string | null {
  if (
    connection.channel === "whatsapp" &&
    connection.provider === "zapi" &&
    connection.broker === "direct"
  ) {
    return connectionIdentityKey(connection);
  }
  if (
    connection.channel === "whatsapp" &&
    connection.provider === "meta_cloud" &&
    connection.broker === "composio"
  ) {
    return connectionIdentityKey(connection);
  }
  if (
    connection.channel === "instagram" &&
    connection.provider === "meta_cloud" &&
    connection.broker === "composio"
  ) {
    return connectionIdentityKey(connection);
  }
  return null;
}

export function connectionIdentityKey(
  connection: Pick<CrmChannelConnection, "broker" | "channel" | "provider">,
) {
  return `${connection.channel}:${connection.provider}:${connection.broker}`;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readCredentialRefs(
  credentialsRef: Record<string, unknown>,
): CrmChannelConnectionCredentialRefs {
  const env =
    credentialsRef.env &&
    typeof credentialsRef.env === "object" &&
    !Array.isArray(credentialsRef.env)
      ? (credentialsRef.env as Record<string, unknown>)
      : {};

  return {
    apiBaseUrlEnv: readString(env.apiBaseUrl),
    apiKeyEnv: readString(env.apiKey),
    clientTokenEnv: readString(env.clientToken),
    composioConnectedAccountConfigured:
      hasComposioConnectedAccount(credentialsRef),
    instanceIdEnv: readString(env.instanceId),
    instanceTokenEnv: readString(env.instanceToken),
    mode: readString(credentialsRef.mode),
    storedInstanceConfigured: hasStoredInstanceCredentials(credentialsRef),
  };
}

function hasComposioConnectedAccount(credentialsRef: Record<string, unknown>) {
  const composio =
    credentialsRef.composio &&
    typeof credentialsRef.composio === "object" &&
    !Array.isArray(credentialsRef.composio)
      ? (credentialsRef.composio as Record<string, unknown>)
      : {};
  return Boolean(readString(composio.connectedAccountId));
}

function hasStoredInstanceCredentials(credentialsRef: Record<string, unknown>) {
  const stored =
    credentialsRef.stored &&
    typeof credentialsRef.stored === "object" &&
    !Array.isArray(credentialsRef.stored)
      ? (credentialsRef.stored as Record<string, unknown>)
      : {};
  return Boolean(
    readString(stored.clientToken) &&
    readString(stored.instanceId) &&
    readString(stored.instanceToken),
  );
}

function readConnectionMetadata(
  metadata: Record<string, unknown>,
): CrmChannelConnectionMetadata {
  return {
    catalogPhone: readString(metadata.catalogPhone),
    connectedPhone: readString(metadata.connectedPhone),
    migrationUnit: readString(metadata.migrationUnit),
    purpose: readString(metadata.purpose),
  };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
