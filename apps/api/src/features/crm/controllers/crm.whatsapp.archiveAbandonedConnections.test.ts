import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { archiveAbandonedZapiConnections } from "../../../domains/crm/services/CrmWhatsappService/archiveAbandonedZapiConnections.js";

const now = new Date("2026-08-10T12:00:00.000Z");

describe("archiveAbandonedZapiConnections", () => {
  it("archives only unheld inactive Z-API sandbox rows at the seven-day boundary", async () => {
    const repository = createMemoryCrmConnectionRepository([
      connection("boundary", "zapi", "sandbox", "2026-08-03T12:00:00.000Z"),
      connection("young", "zapi", "sandbox", "2026-08-03T13:00:00.000Z"),
      connection(
        "official",
        "meta_cloud",
        "sandbox",
        "2026-07-01T00:00:00.000Z",
      ),
      connection("held", "zapi", "sandbox", "2026-07-01T00:00:00.000Z", {
        supportHold: true,
      }),
      connection("cycle", "zapi", "sandbox", "2026-07-01T00:00:00.000Z", {
        hasActiveSession: true,
      }),
      connection("message", "zapi", "sandbox", "2026-07-01T00:00:00.000Z", {
        hasMessage: true,
      }),
      connection(
        "recent-retry",
        "zapi",
        "sandbox",
        "2026-07-01T00:00:00.000Z",
        { updatedAt: "2026-08-09T12:00:00.000Z" },
      ),
    ]);
    const ports = {
      crmConnectionRepository: repository,
      crmRepository: createMemoryCrmRepository(),
    };

    const first = await archiveAbandonedZapiConnections(
      context(),
      { now },
      ports,
    );
    const second = await archiveAbandonedZapiConnections(
      context(),
      { now },
      ports,
    );

    expect(first.archived).toBe(1);
    expect(second.archived).toBe(0);
    await expect(
      repository.findConnectionById("boundary"),
    ).resolves.toMatchObject({ status: "archived" });
    for (const id of [
      "young",
      "official",
      "held",
      "cycle",
      "message",
      "recent-retry",
    ]) {
      await expect(repository.findConnectionById(id)).resolves.toMatchObject({
        status: "sandbox",
      });
    }
  });

  it("preserves tenant ownership while archiving independently eligible rows", async () => {
    const repository = createMemoryCrmConnectionRepository([
      connection(
        "tenant-a",
        "zapi",
        "sandbox",
        "2026-07-01T00:00:00.000Z",
        {},
        "tenant_a",
      ),
      connection(
        "tenant-b-active",
        "zapi",
        "active",
        "2026-07-01T00:00:00.000Z",
        {},
        "tenant_b",
      ),
    ]);
    await archiveAbandonedZapiConnections(
      context(),
      { now },
      {
        crmConnectionRepository: repository,
        crmRepository: createMemoryCrmRepository(),
      },
    );
    await expect(
      repository.findConnectionById("tenant-a"),
    ).resolves.toMatchObject({ status: "archived", tenantId: "tenant_a" });
    await expect(
      repository.findConnectionById("tenant-b-active"),
    ).resolves.toMatchObject({ status: "active", tenantId: "tenant_b" });
  });

  it("purges expired outbound recovery payloads in the scheduled cleanup batch", async () => {
    const purgeExpiredRecoveryPayloads = vi.fn(async () => 3);
    const result = await archiveAbandonedZapiConnections(
      context(),
      { limit: 25, now },
      {
        crmConnectionRepository: createMemoryCrmConnectionRepository(),
        crmRepository: createMemoryCrmRepository(),
        crmOutboundIntentRepository: {
          claim: vi.fn(),
          complete: vi.fn(),
          markIndeterminate: vi.fn(),
          purgeExpiredRecoveryPayloads,
          recordProviderFailure: vi.fn(),
          recordProviderSuccess: vi.fn(),
        },
      },
    );

    expect(purgeExpiredRecoveryPayloads).toHaveBeenCalledWith({
      limit: 25,
      now,
    });
    expect(result.recoveryPayloadsPurged).toBe(3);
  });
});

function context() {
  return createServiceContext({
    actor: { id: "cleanup", kind: "system" },
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "cleanup-test" },
  });
}

function connection(
  id: string,
  provider: CrmConnection["provider"],
  status: CrmConnection["status"],
  createdAt: string,
  metadata: Record<string, unknown> = {},
  tenantId = "tenant_a",
): CrmConnection {
  return {
    broker: provider === "zapi" ? "direct" : "composio",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: id,
    externalConnectionId: null,
    externalInstanceId: null,
    id,
    metadata: { createdAt, ...metadata },
    phone: null,
    provider,
    status,
    storeId: `store_${tenantId}` as StoreId,
    tenantId: tenantId as TenantId,
    webhookUrl: null,
  };
}
