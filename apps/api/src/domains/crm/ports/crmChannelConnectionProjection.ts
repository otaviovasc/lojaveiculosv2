import type {
  CrmConnection,
  CrmConnectionConfiguredStatus,
  CrmConnectionProvider,
} from "./crmConnectionRepository.js";
import {
  crmConnectionCapabilities,
  type CrmChannel,
  type CrmConnectionCapability,
  type CrmConnectionReadiness,
  type CrmConnectionState,
  type CrmProvider,
} from "@lojaveiculosv2/shared";
import type { CrmCredentialBroker } from "../core/models.js";
import type { CrmRoutingConnection } from "./crmRoutingConnectionRepository.js";

export type CanonicalCrmConnectionIdentity = Pick<
  CrmRoutingConnection,
  "channel" | "credentialBroker" | "provider"
>;

export type CrmChannelConnectionProjection = {
  broker: CrmCredentialBroker;
  capabilities: readonly CrmConnectionCapability[];
  channel: CrmChannel;
  connected: boolean;
  degraded: boolean;
  errorCode: string | null;
  provider: CrmProvider;
  readiness: CrmConnectionReadiness;
  state: CrmConnectionState;
};

export function projectCanonicalCrmConnectionRow(input: {
  broker: CrmCredentialBroker;
  channel: CrmChannel;
  metadata: Record<string, unknown>;
  provider: CrmProvider;
  state: CrmConnectionState;
}): CrmChannelConnectionProjection {
  const storedCapabilities = readRecord(input.metadata.capabilities);
  const capabilities = crmConnectionCapabilities.filter(
    (capability) => storedCapabilities[capability] === true,
  );
  const connected = input.metadata.connected === true;
  const degraded = input.metadata.degraded === true || input.state === "error";
  const errorCode = readString(input.metadata.errorCode);
  return {
    broker: input.broker,
    capabilities,
    channel: input.channel,
    connected,
    degraded,
    errorCode,
    provider: input.provider,
    readiness: canonicalReadiness({
      capabilities,
      connected,
      degraded,
      errorCode,
      state: input.state,
    }),
    state: input.state,
  };
}

export function canonicalCrmConnectionIdentity(
  provider: CrmConnectionProvider,
): CanonicalCrmConnectionIdentity {
  if (provider === "zapi") {
    return {
      channel: "whatsapp",
      credentialBroker: "direct",
      provider: "zapi",
    };
  }
  if (provider === "olx_chat") {
    return { channel: "olx_chat", credentialBroker: "direct", provider: "olx" };
  }
  return {
    channel: provider === "composio_instagram" ? "instagram" : "whatsapp",
    credentialBroker: "composio",
    provider: "meta_cloud",
  };
}

export function canonicalCrmConnectionMetadata(input: {
  metadata: Record<string, unknown>;
  provider: CrmConnectionProvider;
  status: CrmConnectionConfiguredStatus;
}) {
  const setup = readRecord(input.metadata.webhookSetup);
  const providerConnected = providerConnectionState(input, setup);
  const connected = input.status === "active" && providerConnected;
  const errorCode = connectionErrorCode(input, setup, connected);
  const storedCapabilities = readRecord(input.metadata.capabilities);
  return {
    ...input.metadata,
    capabilities:
      input.metadata.capabilities === undefined
        ? routingCapabilities(input.provider)
        : {
            inbound: storedCapabilities.inbound === true,
            outbound: storedCapabilities.outbound === true,
            scheduling: storedCapabilities.scheduling === true,
            templates: storedCapabilities.templates === true,
          },
    connected,
    degraded: input.status === "error" || errorCode !== null,
    errorCode,
  };
}

export function toCanonicalRoutingConnection(
  connection: CrmConnection,
): CrmRoutingConnection {
  const canonical = connection.canonical;
  if (!canonical) {
    throw new Error("Canonical CRM channel connection projection is missing.");
  }
  const capabilities = new Set(canonical.capabilities);
  return {
    capabilities: {
      inbound: capabilities.has("inbound"),
      outbound: capabilities.has("outbound"),
      scheduling: capabilities.has("scheduling"),
      templates: capabilities.has("templates"),
    },
    channel: canonical.channel,
    connected: canonical.connected,
    credentialBroker: canonical.broker,
    degraded: canonical.degraded,
    displayName: connection.displayName,
    errorCode: canonical.errorCode,
    id: connection.id,
    provider: canonical.provider,
    state: canonical.state,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  };
}

function canonicalReadiness(input: {
  capabilities: readonly CrmConnectionCapability[];
  connected: boolean;
  degraded: boolean;
  errorCode: string | null;
  state: CrmConnectionState;
}): CrmConnectionReadiness {
  if (input.state === "paused") {
    return { ready: false, reason: "Conexão pausada.", reasonCode: "paused" };
  }
  if (
    input.errorCode === "pending_webhook" ||
    input.errorCode === "not_authorized"
  ) {
    return {
      ready: false,
      reason: input.errorCode,
      reasonCode: input.errorCode,
    };
  }
  if (input.degraded || input.state === "error") {
    return {
      ready: false,
      reason: input.errorCode ?? "O provedor retornou erro.",
      reasonCode: "provider_error",
    };
  }
  if (input.state !== "active" || !input.connected) {
    const reasonCode = canonicalUnavailableReason(input);
    return { ready: false, reason: input.errorCode, reasonCode };
  }
  if (!input.capabilities.length) {
    return {
      ready: false,
      reason: "A conexão não possui capacidades confirmadas.",
      reasonCode: "missing_capability",
    };
  }
  return { ready: true, reason: null, reasonCode: "ready" };
}

function canonicalUnavailableReason(input: {
  errorCode: string | null;
  state: CrmConnectionState;
}): CrmConnectionReadiness["reasonCode"] {
  if (input.errorCode === "pending_webhook") return "pending_webhook";
  if (input.errorCode === "not_authorized") return "not_authorized";
  if (input.state === "disconnected" || input.state === "active") {
    return "disconnected";
  }
  return "not_authorized";
}

function providerConnectionState(
  input: {
    metadata: Record<string, unknown>;
    provider: CrmConnectionProvider;
  },
  setup: Record<string, unknown>,
) {
  if (input.provider === "zapi") {
    return (
      input.metadata.providerConnected === true && setup.status === "configured"
    );
  }
  if (input.provider === "olx_chat") {
    return readRecord(readRecord(setup.capabilities).chat).status === "active";
  }
  return input.metadata.providerConnected === true;
}

function connectionErrorCode(
  input: {
    metadata: Record<string, unknown>;
    status: CrmConnectionConfiguredStatus;
  },
  setup: Record<string, unknown>,
  connected: boolean,
) {
  if (connected) return null;
  return (
    readString(input.metadata.errorCode) ??
    readString(setup.lastErrorCode) ??
    (input.status === "error" ? "provider_error" : null)
  );
}

function routingCapabilities(provider: CrmConnectionProvider) {
  return {
    inbound: true,
    outbound: true,
    scheduling: provider === "zapi",
    templates: provider === "composio_whatsapp",
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
