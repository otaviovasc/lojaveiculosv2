import type { AuditEvent } from "@lojaveiculosv2/audit";
import { createServiceContext } from "../../shared/serviceContext.js";
import type { CrmConnection } from "./ports/crmConnectionRepository.js";
import type { createTestCrmConnectionRepository } from "./testSupportConnections.js";

export async function createOlxConnection(
  repository: ReturnType<typeof createTestCrmConnectionRepository>,
) {
  const connection = (
    await repository.upsertOlxConnection({
      credentialsRef: {
        stored: {
          accessToken: "sealed-access",
          webhookSecret: "sealed-webhook",
        },
      },
      displayName: "OLX Chat",
      externalConnectionId: "olx-account",
      metadata: {
        webhookSetup: {
          attemptCount: 2,
          capabilities: {
            chat: { status: "error" },
            leads: { marker: "unchanged", status: "active" },
            stock: { marker: "unchanged", status: "active" },
          },
          failures: { leads: { marker: "unchanged" } },
          status: "partial",
        },
      },
      status: "active",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      webhookUrl: null,
    })
  ).connection;
  return (
    (await repository.updateConnection({
      connectionId: connection.id,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      webhookUrl: `https://api.example.test/api/v1/crm/whatsapp/webhooks/olx/${connection.id}/received`,
    })) ?? connection
  );
}

export function createFailedOlxConnection(): CrmConnection {
  const id = "olx-connection-1";
  return {
    credentialsRef: {
      stored: {
        accessToken: "sealed-access",
        webhookSecret: "sealed-webhook",
      },
    },
    displayName: "OLX Chat",
    externalConnectionId: "olx-account",
    externalInstanceId: null,
    id,
    metadata: {
      webhookSetup: {
        capabilities: {
          chat: { status: "error" },
          leads: { marker: "unchanged", status: "active" },
          stock: { marker: "unchanged", status: "active" },
        },
        status: "partial",
      },
    },
    phone: null,
    provider: "olx_chat",
    status: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: `https://api.example.test/api/v1/crm/whatsapp/webhooks/olx/${id}/received`,
  };
}

export function createRetryOlxChatSetupContext(
  audit?: { record: (event: AuditEvent) => Promise<void> },
  storeId = "store_1",
  tenantId = "tenant_1",
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    ...(audit ? { audit } : {}),
    entitlements: ["crm"],
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "request_1" },
    storeId,
    tenantId,
  });
}
