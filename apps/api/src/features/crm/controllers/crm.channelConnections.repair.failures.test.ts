import { describe, expect, it, vi } from "vitest";
import type { CrmMessagingConfigureWebhooksInput } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  createConnection,
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
import {
  createRepairApp,
  disconnectedConnection,
  disconnectedZapiRepository,
  listStoredConnections,
  requestCredentialRepair,
} from "./crm.channelConnections.repair.testSupport.js";

describe("CRM channel connection repair failures", () => {
  it("restores the prior credentials when webhook verification fails", async () => {
    const repository = disconnectedZapiRepository();
    const app = createRepairApp(repository, {
      configureWebhooks: vi.fn(
        async (_connection, input: CrmMessagingConfigureWebhooksInput) => ({
          results: input.webhooks.map((webhook) => ({
            error: "provider rejected webhook",
            ok: false,
            status: 401,
            type: webhook.type,
            url: webhook.url,
            verified: false,
          })),
        }),
      ),
    });

    const response = await requestCredentialRepair(app);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_ZAPI_CREDENTIAL_VERIFICATION_FAILED",
    });
    await expectPriorCredentials(repository);
  });

  it("restores the prior credentials when provider status cannot be verified", async () => {
    const repository = disconnectedZapiRepository();
    const app = createRepairApp(repository, {
      configureWebhooks: vi.fn(
        async (_connection, input: CrmMessagingConfigureWebhooksInput) => ({
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
      validateStatus: vi.fn(async () => {
        throw new Error("provider status unavailable");
      }),
    });

    const response = await requestCredentialRepair(app);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_ZAPI_CREDENTIAL_VERIFICATION_FAILED",
    });
    await expectPriorCredentials(repository);
  });

  it.each([
    ["archived", { status: "archived" as const }],
    ["another store", { storeId: "other_store" as never }],
  ])("does not repair a connection scoped as %s", async (_label, override) => {
    const repository = createMemoryCrmConnectionRepository([
      { ...disconnectedConnection(), ...override },
    ]);

    expect(
      (await requestCredentialRepair(createRepairApp(repository))).status,
    ).toBe(404);
  });

  it("does not repair a non-Z-API connection", async () => {
    const repository = createMemoryCrmConnectionRepository([
      {
        ...createConnection("meta_cloud"),
        status: "disconnected",
        storeId: customerStoreId,
        tenantId: customerTenantId,
      },
    ]);
    const configureWebhooks = vi.fn();

    expect(
      (
        await requestCredentialRepair(
          createRepairApp(repository, { configureWebhooks }),
        )
      ).status,
    ).toBe(404);
    expect(configureWebhooks).not.toHaveBeenCalled();
  });
});

async function expectPriorCredentials(
  repository: ReturnType<typeof disconnectedZapiRepository>,
) {
  await expect(listStoredConnections(repository)).resolves.toMatchObject([
    {
      credentialsRef: {
        stored: { instanceToken: "sealed:expired-token" },
      },
      status: "disconnected",
    },
  ]);
}
