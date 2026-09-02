import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmMessagingConfigureWebhooksInput,
  CrmMessagingConfigureWebhooksResult,
  CrmMessagingGateway,
  CrmMessagingProviderStatus,
} from "../../../domains/crm/ports/crmMessagingGateway.js";
import type { UazapiConnectionSetupProvider } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";

export const connectionId = "24000000-0000-4000-8000-000000000401";

export function createUazapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      mode: "stored",
      stored: {
        baseUrl: "sealed:https://uazapi.test",
        instanceId: "sealed:instance-1",
        instanceToken: "sealed:instance-token-1",
        webhookSecret: "sealed:webhook-secret",
      },
    },
    displayName: "WhatsApp Loja",
    externalConnectionId: null,
    externalInstanceId: "instance-1",
    id: connectionId,
    metadata: { uazapiWebhookSetup: { state: "pending" } },
    phone: "5511999990000",
    provider: "uazapi",
    status: "sandbox",
    storeId: customerStoreId,
    tenantId: customerTenantId,
    webhookUrl: null,
    ...overrides,
  };
}

export function createSetupProvider(
  overrides: Partial<UazapiConnectionSetupProvider> = {},
): UazapiConnectionSetupProvider & {
  getPairingCode: ReturnType<typeof vi.fn>;
  getQrCode: ReturnType<typeof vi.fn>;
  validateStatus: ReturnType<typeof vi.fn>;
} {
  return {
    getPairingCode: vi.fn(async () => ({
      code: "1234-5678",
      kind: "code" as const,
    })),
    getQrCode: vi.fn(async () => ({
      dataUri: "data:image/png;base64,uazapi-qr",
      expiresInSeconds: 60,
    })),
    validateStatus: vi.fn(async () => ({
      connected: false,
      connectedPhone: null,
      smartphoneConnected: false,
    })),
    ...overrides,
  } as never;
}

type ConfigureWebhooksMock = ReturnType<
  typeof vi.fn<CrmMessagingGateway["configureWebhooks"]>
>;

export function createGateway(overrides: {
  configureWebhooks?: ConfigureWebhooksMock;
  disconnectConnection?: ReturnType<
    typeof vi.fn<CrmMessagingGateway["disconnectConnection"]>
  >;
  getConnectionStatus?: ReturnType<
    typeof vi.fn<CrmMessagingGateway["getConnectionStatus"]>
  >;
}): Pick<
  CrmMessagingGateway,
  "configureWebhooks" | "disconnectConnection" | "getConnectionStatus"
> & { configureWebhooks: ConfigureWebhooksMock } {
  return {
    configureWebhooks:
      overrides.configureWebhooks ??
      vi.fn<CrmMessagingGateway["configureWebhooks"]>(
        async (_connection, input) => ({
          results: input.webhooks.map((webhook) => ({
            error: null,
            ok: true,
            status: 200,
            type: webhook.type,
            url: webhook.url,
            verified: true,
          })),
        }),
      ),
    disconnectConnection:
      overrides.disconnectConnection ??
      vi.fn<CrmMessagingGateway["disconnectConnection"]>(async () => ({
        disconnected: true as const,
      })),
    getConnectionStatus:
      overrides.getConnectionStatus ??
      vi.fn<CrmMessagingGateway["getConnectionStatus"]>(
        async (): Promise<CrmMessagingProviderStatus> => ({
          checkedAt: new Date("2026-08-12T12:00:00.000Z"),
          connected: false,
          connectedPhone: null,
          providerStatus: "disconnected",
          smartphoneConnected: false,
        }),
      ),
  };
}
