import type {
  CrmConnection,
  CrmConnectionConfiguredStatus,
  CrmConnectionProvider,
} from "../ports/crmConnectionRepository.js";
import type {
  CrmChannel,
  CrmConnectionReadiness,
  CrmConnectionState,
} from "@lojaveiculosv2/shared";
import type { CrmWhatsappProviderStatus } from "../ports/crmWhatsappGateway.js";
import {
  readZapiWebhookSetupState,
  type ZapiWebhookSetupState,
} from "./zapiWebhookSetupState.js";
import {
  isConnectionReady,
  readinessFor,
} from "./whatsappConnectionReadiness.js";
import { providerCapabilities } from "./whatsappProviderCapabilities.js";

export { providerCapabilities } from "./whatsappProviderCapabilities.js";

export type WhatsappConnectionLiveStatus =
  | (CrmWhatsappProviderStatus & {
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

export type WhatsappConnection = {
  /** Canonical multi-channel fields. Legacy setup fields below remain adapter-owned. */
  channel?: CrmChannel;
  capabilities: WhatsappProviderCapabilities;
  credentials: WhatsappConnectionCredentialRefs;
  displayName: string;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  id: string;
  live: WhatsappConnectionLiveStatus;
  metadata: WhatsappConnectionMetadata;
  phone: string | null;
  provider: CrmConnectionProvider;
  readiness?: CrmConnectionReadiness;
  ready: boolean;
  state?: CrmConnectionState;
  isDefault?: boolean;
  setup: ZapiWebhookSetupState | null;
  status: CrmConnectionConfiguredStatus;
};

export type WhatsappProviderCapabilities = {
  audio: boolean;
  catalog: boolean;
  conversationStart: boolean;
  delete: boolean;
  documents: boolean;
  imageCaption: boolean;
  images: boolean;
  location: boolean;
  quickMessages: boolean;
  reactions: boolean;
  reply: boolean;
  scheduling: boolean;
  templates: boolean;
  text: boolean;
  vehicle: boolean;
  video: boolean;
};

export type WhatsappConnectionCredentialRefs = {
  apiBaseUrlEnv: string | null;
  apiKeyEnv: string | null;
  clientTokenEnv: string | null;
  composioConnectedAccountConfigured: boolean;
  instanceIdEnv: string | null;
  instanceTokenEnv: string | null;
  mode: string | null;
  storedInstanceConfigured: boolean;
};

export type WhatsappConnectionMetadata = {
  catalogPhone: string | null;
  connectedPhone: string | null;
  migrationUnit: string | null;
  purpose: string | null;
};

export function toWhatsappConnection(
  connection: CrmConnection,
  live: WhatsappConnectionLiveStatus,
): WhatsappConnection {
  const setup =
    connection.provider === "zapi"
      ? readZapiWebhookSetupState(connection.metadata)
      : null;
  const channel = channelForProvider(connection.provider);
  const ready = isConnectionReady(connection, live, setup);
  return {
    channel,
    capabilities: providerCapabilities(connection.provider),
    credentials: readCredentialRefs(connection.credentialsRef),
    displayName: connection.displayName,
    externalConnectionId: connection.externalConnectionId,
    externalInstanceId: connection.externalInstanceId,
    id: connection.id,
    live,
    metadata: readConnectionMetadata(connection.metadata),
    phone: connection.phone,
    provider: connection.provider,
    readiness: readinessFor(connection, live, setup, ready),
    ready,
    state: connection.status,
    isDefault: false,
    setup,
    status: connection.status,
  };
}

function channelForProvider(provider: CrmConnectionProvider): CrmChannel {
  if (provider === "composio_instagram") return "instagram";
  if (provider === "olx_chat") return "olx_chat";
  return "whatsapp";
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readCredentialRefs(
  credentialsRef: Record<string, unknown>,
): WhatsappConnectionCredentialRefs {
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
    readString(stored.instanceId) && readString(stored.instanceToken),
  );
}

function readConnectionMetadata(
  metadata: Record<string, unknown>,
): WhatsappConnectionMetadata {
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
