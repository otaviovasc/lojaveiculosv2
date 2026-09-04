import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createAuditSpy, createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const zapiId = "24000000-0000-4000-8000-000000000111";
const officialId = "24000000-0000-4000-8000-000000000112";

describe("CRM connection entitlements", () => {
  it("denies pausing Z-API without the base CRM entitlement", async () => {
    const { audit, record } = createAuditSpy();
    const repository = createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]);
    const app = createTestApp({
      audit,
      crmConnectionRepository: repository,
      entitlements: [],
    });

    const response = await patchStatus(app, zapiId);

    expect(response.status).toBe(403);
    await expect(repository.findConnectionById(zapiId)).resolves.toMatchObject({
      status: "active",
    });
    expect(record).not.toHaveBeenCalled();
  });

  it("pauses Z-API when the store has the base CRM entitlement", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      entitlements: ["crm"],
    });

    const response = await patchStatus(app, zapiId);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: zapiId,
      state: "paused",
    });
    await expect(repository.findConnectionById(zapiId)).resolves.toMatchObject({
      status: "paused",
    });
  });

  it("uses the CRM entitlement for official connection updates", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createOfficialConnection(),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      entitlements: ["crm"],
    });

    const response = await patchStatus(app, officialId);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: officialId,
      provider: "meta_cloud",
      state: "paused",
    });
    await expect(
      repository.findConnectionById(officialId),
    ).resolves.toMatchObject({ status: "paused" });
  });
});

function patchStatus(
  app: ReturnType<typeof createTestApp>,
  connectionId: string,
) {
  return app.request(`/api/v1/crm/channel-connections/${connectionId}`, {
    body: JSON.stringify({ status: "paused" }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

function createZapiConnection(): CrmConnection {
  return createConfiguredZapiTestConnection({
    id: zapiId,
    storeId,
    tenantId,
  });
}

function createOfficialConnection(): CrmConnection {
  return {
    broker: "composio",
    channel: "whatsapp",
    credentialsRef: {
      composio: { connectedAccountId: "ca_test" },
      env: { apiKey: "COMPOSIO_API_KEY" },
      mode: "composio",
    },
    displayName: "WhatsApp Oficial",
    externalConnectionId: "phone-number-id",
    externalInstanceId: null,
    id: officialId,
    metadata: {
      capabilities: { inbound: true, outbound: true, templates: true },
      connected: true,
      graphVersion: "v25.0",
      providerConnected: true,
    },
    phone: null,
    provider: "meta_cloud",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
