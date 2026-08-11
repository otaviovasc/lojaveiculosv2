import type {
  CrmConnection,
  CrmConnectionConfiguredStatus,
  CrmConnectionProvider,
} from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappProviderStatus } from "../ports/crmWhatsappGateway.js";
import {
  readZapiWebhookSetupState,
  type ZapiWebhookSetupState,
} from "./zapiWebhookSetupState.js";

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
  ready: boolean;
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
  return {
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
    ready:
      live.connected === true &&
      (connection.provider !== "zapi" || setup?.status === "configured"),
    setup,
    status: connection.status,
  };
}

export function providerCapabilities(
  provider: CrmConnectionProvider,
): WhatsappProviderCapabilities {
  if (provider === "olx_chat") {
    return {
      audio: false,
      catalog: false,
      conversationStart: false,
      delete: false,
      documents: false,
      imageCaption: false,
      images: false,
      location: false,
      quickMessages: false,
      reactions: false,
      reply: false,
      scheduling: false,
      templates: false,
      text: true,
      vehicle: false,
      video: false,
    };
  }
  if (provider === "composio_instagram") {
    return {
      audio: false,
      catalog: false,
      conversationStart: false,
      delete: false,
      documents: false,
      imageCaption: false,
      images: true,
      location: false,
      quickMessages: false,
      reactions: false,
      reply: false,
      scheduling: false,
      templates: false,
      text: true,
      vehicle: false,
      video: false,
    };
  }
  if (provider === "composio_whatsapp") {
    return {
      audio: true,
      catalog: false,
      conversationStart: true,
      delete: false,
      documents: true,
      imageCaption: true,
      images: true,
      location: true,
      quickMessages: true,
      reactions: false,
      reply: true,
      scheduling: false,
      templates: true,
      text: true,
      vehicle: true,
      video: true,
    };
  }
  return {
    audio: true,
    catalog: true,
    conversationStart: true,
    delete: true,
    documents: true,
    imageCaption: true,
    images: true,
    location: true,
    quickMessages: true,
    reactions: true,
    reply: true,
    scheduling: true,
    templates: false,
    text: true,
    vehicle: true,
    video: true,
  };
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
