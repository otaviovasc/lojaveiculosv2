import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../../../domains/crm/ports/crmConnectionRepository.js";

type SetupMethods = Pick<
  CrmConnectionRepository,
  | "claimOlxWebhookSetup"
  | "claimZapiWebhookSetup"
  | "configureInitialZapiCredentials"
  | "finishOlxWebhookSetup"
  | "finishZapiWebhookSetup"
>;

export function createMemoryCrmConnectionSetupMethods(
  connections: CrmConnection[],
  normalize: (connection: CrmConnection) => CrmConnection,
): SetupMethods {
  return {
    async configureInitialZapiCredentials(input) {
      const connection = findSetupConnection(connections, input, "zapi");
      if (!connection || connection.status === "archived") {
        return { status: "not_found" };
      }
      const state = readZapiCredentialState(connection.credentialsRef);
      if (state !== "unconfigured") return { status: state };
      connection.credentialsRef = input.credentialsRef;
      connection.externalInstanceId = null;
      return { connection: normalize(connection), status: "configured" };
    },
    async claimZapiWebhookSetup(input) {
      const connection = findSetupConnection(connections, input, "zapi");
      if (!connection || connection.status === "archived") return null;
      const setup = readRecord(connection.metadata.webhookSetup);
      if (setup.status === "configured" && !input.allowConfigured) return null;
      if (hasActiveLease(setup, input.now)) return null;
      applyClaim(connection, setup, input);
      return normalize(connection);
    },
    async claimOlxWebhookSetup(input) {
      const connection = findSetupConnection(connections, input, "olx");
      if (!connection || connection.status === "archived") return null;
      const setup = readRecord(connection.metadata.webhookSetup);
      if (
        ["configured", "indeterminate"].includes(String(setup.status)) ||
        hasActiveLease(setup, input.now)
      ) {
        return null;
      }
      applyClaim(connection, setup, input);
      return normalize(connection);
    },
    async finishZapiWebhookSetup(input) {
      const connection = findSetupConnection(connections, input, "zapi");
      if (!connection || !ownsLease(connection, input.leaseOwner)) return null;
      connection.metadata = { ...connection.metadata, ...input.metadata };
      return normalize(connection);
    },
    async finishOlxWebhookSetup(input) {
      const connection = findSetupConnection(connections, input, "olx");
      if (!connection || !ownsLease(connection, input.leaseOwner)) return null;
      const setup = readRecord(input.metadata.webhookSetup);
      connection.metadata = { ...connection.metadata, ...input.metadata };
      connection.status = ["configured", "partial"].includes(
        String(setup.status),
      )
        ? "active"
        : "error";
      return normalize(connection);
    },
  };
}

function findSetupConnection(
  connections: CrmConnection[],
  input: { connectionId: string; storeId: string; tenantId: string },
  provider: CrmConnection["provider"],
) {
  return connections.find(
    (connection) =>
      connection.id === input.connectionId &&
      connection.storeId === input.storeId &&
      connection.tenantId === input.tenantId &&
      connection.provider === provider,
  );
}

function applyClaim(
  connection: CrmConnection,
  setup: Record<string, unknown>,
  input: { leaseExpiresAt: Date; leaseOwner: string; now: Date },
) {
  connection.metadata = {
    ...connection.metadata,
    webhookSetup: {
      ...setup,
      attemptCount:
        (typeof setup.attemptCount === "number" ? setup.attemptCount : 0) + 1,
      lastErrorCode: null,
      leaseExpiresAt: input.leaseExpiresAt.toISOString(),
      leaseOwner: input.leaseOwner,
      status: "configuring",
      updatedAt: input.now.toISOString(),
    },
  };
}

function hasActiveLease(setup: Record<string, unknown>, now: Date) {
  const expiresAt = readDateOrNull(setup.leaseExpiresAt);
  return Boolean(setup.leaseOwner && expiresAt && expiresAt > now);
}

function ownsLease(connection: CrmConnection, leaseOwner: string) {
  return readRecord(connection.metadata.webhookSetup).leaseOwner === leaseOwner;
}

function readZapiCredentialState(credentialsRef: Record<string, unknown>) {
  const stored = readRecord(credentialsRef.stored);
  const clientToken = readConfiguredString(stored.clientToken);
  const instanceId = readConfiguredString(stored.instanceId);
  const instanceToken = readConfiguredString(stored.instanceToken);
  if (clientToken && instanceId && instanceToken)
    return "already_configured" as const;
  if (clientToken || instanceId || instanceToken)
    return "partial_state" as const;
  return "unconfigured" as const;
}

function readDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readConfiguredString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}
