import type { CrmConnection } from "./crmConnectionRepository.js";
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
  credentialsRef?: Record<string, unknown>;
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
  const errorCode =
    input.provider === "zapi" &&
    !hasCompleteZapiCredentials(input.credentialsRef ?? input.metadata)
      ? "credentials_incomplete"
      : readString(input.metadata.errorCode);
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
  input: Pick<CrmConnection, "broker" | "channel" | "provider">,
): CanonicalCrmConnectionIdentity {
  return {
    channel: input.channel,
    credentialBroker: input.broker,
    provider: input.provider,
  };
}

export function canonicalCrmConnectionMetadata(input: {
  metadata: Record<string, unknown>;
}) {
  const storedCapabilities = readRecord(input.metadata.capabilities);
  return {
    ...input.metadata,
    capabilities: {
      catalog: storedCapabilities.catalog === true,
      conversation_start: storedCapabilities.conversation_start === true,
      delete: storedCapabilities.delete === true,
      inbound: storedCapabilities.inbound === true,
      media: storedCapabilities.media === true,
      outbound: storedCapabilities.outbound === true,
      reactions: storedCapabilities.reactions === true,
      scheduling: storedCapabilities.scheduling === true,
      templates: storedCapabilities.templates === true,
      text: storedCapabilities.text === true,
    },
    connected: input.metadata.connected === true,
    degraded: input.metadata.degraded === true,
    errorCode: readString(input.metadata.errorCode),
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
      catalog: capabilities.has("catalog"),
      conversation_start: capabilities.has("conversation_start"),
      delete: capabilities.has("delete"),
      inbound: capabilities.has("inbound"),
      media: capabilities.has("media"),
      outbound: capabilities.has("outbound"),
      reactions: capabilities.has("reactions"),
      scheduling: capabilities.has("scheduling"),
      templates: capabilities.has("templates"),
      text: capabilities.has("text"),
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
    input.errorCode === "not_authorized" ||
    input.errorCode === "credentials_incomplete"
  ) {
    return {
      ready: false,
      reason: input.errorCode,
      reasonCode:
        input.errorCode === "credentials_incomplete"
          ? "not_authorized"
          : input.errorCode,
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

function hasCompleteZapiCredentials(source: Record<string, unknown>) {
  const credentialsRef = source.credentialsRef
    ? readRecord(source.credentialsRef)
    : source;
  const stored = readRecord(credentialsRef.stored);
  return Boolean(
    readString(stored.clientToken) &&
    readString(stored.instanceId) &&
    readString(stored.instanceToken),
  );
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

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
