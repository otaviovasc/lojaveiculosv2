export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readConfiguredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeTestCrmConnection(connection: CrmConnection) {
  connection.metadata = canonicalCrmConnectionMetadata({
    metadata: connection.metadata,
  });
  const identity = connection.canonical
    ? {
        channel: connection.canonical.channel,
        credentialBroker: connection.canonical.broker,
        provider: connection.canonical.provider,
      }
    : canonicalCrmConnectionIdentity(connection);
  connection.canonical = projectCanonicalCrmConnectionRow({
    broker: identity.credentialBroker,
    channel: identity.channel,
    metadata: connection.metadata,
    provider: identity.provider,
    state: connection.status,
  });
  return connection;
}
import {
  canonicalCrmConnectionIdentity,
  canonicalCrmConnectionMetadata,
  projectCanonicalCrmConnectionRow,
} from "./ports/crmChannelConnectionProjection.js";
import type { CrmConnection } from "./ports/crmConnectionRepository.js";
