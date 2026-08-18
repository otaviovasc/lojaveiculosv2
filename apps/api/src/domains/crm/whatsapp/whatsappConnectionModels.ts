import type {
  CrmConnection,
  CrmConnectionConfiguredStatus,
  CrmConnectionProvider,
} from "../ports/crmConnectionRepository.js";
import {
  crmChannelConnectionSchema,
  type CrmChannelConnectionDto,
} from "@lojaveiculosv2/shared";
import type { CrmCredentialBroker } from "../core/models.js";
import type { CrmWhatsappProviderStatus } from "../ports/crmWhatsappGateway.js";
import {
  readZapiWebhookSetupState,
  type ZapiWebhookSetupState,
} from "./zapiWebhookSetupState.js";

/** Provider transport abilities for adapter operations, not connection DTO facts. */
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

export type WhatsappConnection = CrmChannelConnectionDto & {
  /** Canonical multi-channel fields. Legacy setup fields below remain adapter-owned. */
  broker: CrmCredentialBroker;
  credentials: WhatsappConnectionCredentialRefs;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  live: WhatsappConnectionLiveStatus;
  metadata: WhatsappConnectionMetadata;
  phone: string | null;
  ready: boolean;
  setup: ZapiWebhookSetupState | null;
  status: CrmConnectionConfiguredStatus;
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
    setup,
    status: connection.status,
  };
}

export function setupProviderForConnection(
  connection: Pick<WhatsappConnection, "broker" | "channel" | "provider">,
): readonly CrmConnectionProvider[] {
  if (
    connection.channel === "whatsapp" &&
    connection.provider === "zapi" &&
    connection.broker === "direct"
  ) {
    return ["zapi"];
  }
  if (
    connection.channel === "whatsapp" &&
    connection.provider === "meta_cloud" &&
    connection.broker === "composio"
  ) {
    return ["composio_whatsapp"];
  }
  if (
    connection.channel === "instagram" &&
    connection.provider === "meta_cloud" &&
    connection.broker === "composio"
  ) {
    return ["composio_instagram"];
  }
  return [];
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
