import { randomBytes } from "node:crypto";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../../ports/crmConnectionSetupProvider.js";
import {
  CrmConnectionNotFoundError,
  CrmMessageActionError,
} from "../../messaging/crmMessagingErrors.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";

const webhookSecretOverlapMs = 10 * 60 * 1_000;

export async function stageZapiWebhookSecretRotation(
  connection: CrmConnection,
  ports: CrmServicePorts,
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const pendingWebhookSecret = await getCrmConnectionCredentialVault(
    ports,
  ).seal({
    plaintext: randomBytes(32).toString("base64url"),
    purpose: ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    credentialsRef: {
      ...connection.credentialsRef,
      mode: "stored",
      stored: {
        ...stored,
        pendingWebhookSecret,
        pendingWebhookSecretExpiresAt: new Date(
          Date.now() + webhookSecretOverlapMs,
        ).toISOString(),
      },
    },
    ...(connection.revision === undefined
      ? {}
      : { expectedRevision: connection.revision }),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) {
    throw new CrmMessageActionError(
      "The Z-API webhook secret rotation conflicted with another update.",
      409,
    );
  }
  return { connection: updated, pendingWebhookSecret };
}

export async function promoteZapiWebhookSecret(
  connectionId: string,
  pendingWebhookSecret: string,
  ports: CrmServicePorts,
) {
  const repository = getCrmConnectionRepository(ports);
  const connection = await repository.findConnectionById(connectionId);
  if (!connection) throw new CrmConnectionNotFoundError(connectionId);
  const stored = readRecord(connection.credentialsRef.stored);
  if (stored.pendingWebhookSecret !== pendingWebhookSecret) {
    throw new CrmMessageActionError(
      "The Z-API webhook secret changed during provider verification.",
      409,
    );
  }
  const current = readString(stored.webhookSecret);
  const preserved = { ...stored };
  delete preserved.pendingWebhookSecret;
  delete preserved.pendingWebhookSecretExpiresAt;
  const updated = await repository.updateConnection({
    connectionId,
    credentialsRef: {
      ...connection.credentialsRef,
      mode: "stored",
      stored: {
        ...preserved,
        ...(current
          ? {
              previousWebhookSecret: current,
              previousWebhookSecretExpiresAt: new Date(
                Date.now() + webhookSecretOverlapMs,
              ).toISOString(),
            }
          : {}),
        webhookSecret: pendingWebhookSecret,
      },
    },
    ...(connection.revision === undefined
      ? {}
      : { expectedRevision: connection.revision }),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) {
    throw new CrmMessageActionError(
      "The Z-API webhook secret rotation conflicted with another update.",
      409,
    );
  }
  return updated;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
