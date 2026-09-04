import { vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { ZapiConnectionSetupProvider } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  connectionId,
  createConnection,
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

export function createRepairApp(
  repository: ReturnType<typeof disconnectedZapiRepository>,
  effects: {
    configureWebhooks?: CrmMessagingGateway["configureWebhooks"];
    validateStatus?: ZapiConnectionSetupProvider["validateStatus"];
  } = {},
) {
  return createTestApp({
    crmConnectionCredentialVault: {
      open: vi.fn(async ({ sealed }: { sealed: string }) =>
        sealed.replace(/^sealed:/u, ""),
      ),
      seal: vi.fn(
        async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
      ),
    },
    crmConnectionRepository: repository,
    crmMessagingGateway: {
      configureWebhooks: effects.configureWebhooks ?? vi.fn(),
    },
    permissions: [
      "crm.messaging.connection.setup",
      "crm.messaging.credentials.rotate",
    ],
    zapiConnectionSetupProvider: {
      getPairingCode: vi.fn(),
      getQrCode: vi.fn(),
      validateStatus: effects.validateStatus ?? vi.fn(),
    },
  });
}

export function requestCredentialRepair(
  app: ReturnType<typeof createTestApp>,
  instanceId = "instance-1",
) {
  return app.request(
    `/api/v1/crm/channel-connections/${connectionId}/zapi/credentials`,
    {
      body: JSON.stringify({
        clientToken: "replacement-client-token",
        instanceId,
        instanceToken: "replacement-token",
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    },
  );
}

export function disconnectedZapiRepository() {
  return createMemoryCrmConnectionRepository([disconnectedConnection()]);
}

export function disconnectedConnection(): CrmConnection {
  return {
    ...createConnection("zapi", {
      mode: "stored",
      stored: {
        clientToken: "sealed:expired-client-token",
        instanceId: "sealed:instance-1",
        instanceToken: "sealed:expired-token",
      },
    }),
    externalInstanceId: "instance-1",
    status: "disconnected",
    storeId: customerStoreId,
    tenantId: customerTenantId,
  };
}

export function listStoredConnections(
  repository: ReturnType<typeof disconnectedZapiRepository>,
) {
  return repository.listConnections({
    storeId: customerStoreId,
    tenantId: customerTenantId,
  });
}
