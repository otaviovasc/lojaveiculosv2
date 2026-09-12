import { type Mock, vi } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

export const storeId = "25000000-0000-4000-8000-000000000001" as never;
export const tenantId = "25000000-0000-4000-8000-000000000002" as never;

type ConfigureWebhooks = NonNullable<
  CrmServicePorts["crmMessagingGateway"]
>["configureWebhooks"];

export function setup(overrides: Partial<CrmConnection> = {}): {
  audit: ReturnType<typeof createMemoryAuditSink>;
  configureWebhooks: Mock<ConfigureWebhooks>;
  ports: CrmServicePorts;
  repository: ReturnType<typeof createTestCrmConnectionRepository>;
} {
  const audit = createMemoryAuditSink();
  const secrets = new Map([
    ["sealed:instance-one", "instance-one"],
    ["sealed:token-one", "token-one"],
    ["sealed:webhook-one", "webhook-one"],
  ]);
  let sequence = 0;
  const repository = createTestCrmConnectionRepository([
    { ...connection(), ...overrides },
  ]);
  const configureWebhooks = vi.fn(
    async (
      _connection: CrmConnection,
      input: { webhooks: readonly { type: string; url: string }[] },
    ) => ({
      results: input.webhooks.map((webhook) => ({
        error: null,
        ok: true,
        status: 200,
        type: webhook.type,
        url: webhook.url,
        verified: true,
      })),
    }),
  );
  const ports: CrmServicePorts = {
    crmConnectionCredentialVault: {
      open: async ({ sealed }: { sealed: string }) =>
        secrets.get(sealed) ?? sealed.replace(/^sealed:/u, ""),
      seal: async ({ plaintext }: { plaintext: string }) => {
        const sealed = plaintext.startsWith("webhook-")
          ? `sealed:webhook-new-${++sequence}`
          : `sealed:${plaintext}`;
        secrets.set(sealed, plaintext);
        return sealed;
      },
    },
    crmConnectionRepository: repository,
    crmRepository: {} as never,
    crmMessagingGateway: {
      configureWebhooks,
      getConnectionStatus: vi.fn(async () => ({
        checkedAt: new Date("2026-08-12T12:00:00.000Z"),
        connected: false,
        connectedPhone: null,
        providerStatus: "disconnected" as const,
        smartphoneConnected: false,
      })),
    } as never,
    crmZapiSupportAuthorizer: {
      assertCrmSetupEligible: vi.fn(async () => undefined),
    },
    zapiConnectionSetupProvider: {
      getPairingCode: vi.fn(),
      getQrCode: vi.fn(),
      validateStatus: vi.fn(async () => ({
        connected: false,
        connectedPhone: null,
        smartphoneConnected: false,
      })),
    },
  };
  return { audit, configureWebhooks, ports, repository };
}

export function supportContext(
  audit: ReturnType<typeof createMemoryAuditSink>,
) {
  return createServiceContext({
    actor: { id: "support-one", kind: "user" },
    audit,
    logger: createNoopServiceLogger(),
    permissions: ["crm.messaging.support.manage"],
    request: { requestId: "request-one" },
    storeId: null,
    tenantId: null,
  });
}

export function updateInput(instanceId: string, instanceToken: string) {
  return {
    basePath: "/api/v1/crm",
    canonicalApiOrigin: "https://api.example.test",
    connectionId: "connection-one",
    clientToken: "client-token",
    instanceId,
    instanceToken,
    storeId,
    tenantId,
  };
}

export function stored(
  connection: CrmConnection | null | undefined,
  key: string,
) {
  const value = connection?.credentialsRef.stored;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : null;
}

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      mode: "stored",
      stored: {
        instanceId: "sealed:instance-one",
        instanceToken: "sealed:token-one",
        webhookSecret: "sealed:webhook-one",
      },
    },
    displayName: "Z-API principal",
    externalConnectionId: null,
    externalInstanceId: "instance-one",
    id: "connection-one",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
