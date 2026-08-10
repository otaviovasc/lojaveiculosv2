import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createZapiWebhookSetupIntent } from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;
export const connectionId = "24000000-0000-4000-8000-000000000101";

export async function createWebhookTestApp(
  input: {
    connectionRepository?: ReturnType<
      typeof createMemoryCrmConnectionRepository
    >;
  } = {},
) {
  const { audit, record } = createAuditSpy();
  const whatsappRepository = createMemoryCrmWhatsappRepository();
  await whatsappRepository.ingestMessage({
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Mensagem enviada",
    direction: "OUTBOUND",
    externalId: "zapi-out-1",
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
    senderType: "HUMAN",
    status: "SENT",
    storeId,
    tenantId,
    type: "TEXT",
  });
  const app = createTestApp({
    audit,
    crmConnectionCredentialVault: testVault(),
    crmConnectionRepository:
      input.connectionRepository ??
      createMemoryCrmConnectionRepository([createZapiConnection()]),
    crmWhatsappRepository: whatsappRepository,
  });
  return { app, auditRecord: record, whatsappRepository };
}

export async function readSessionId(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
) {
  const sessions = await whatsappRepository.listSessions({
    limit: 1,
    offset: 0,
    storeId,
    tenantId,
  });
  return sessions[0]?.id ?? null;
}

export function postWebhook(
  app: ReturnType<typeof createTestApp>,
  event: string,
  payload: Record<string, unknown>,
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/${event}`,
    {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "x-crm-webhook-token": "webhook-secret",
      },
      method: "POST",
    },
  );
}

export function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: { stored: { webhookSecret: "sealed:webhook-secret" } },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {
      webhookSetup: {
        ...createZapiWebhookSetupIntent(connectionId),
        configuredAt: "2026-08-01T00:00:00.000Z",
        status: "configured",
      },
    },
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}

function testVault() {
  return {
    open: async ({ sealed }: { sealed: string }) =>
      sealed.replace(/^sealed:/u, ""),
    seal: async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
  };
}
