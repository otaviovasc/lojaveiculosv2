import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmChannelConnectionOverview } from "./crmChannelConnections.js";

const storeId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

describe("getCrmChannelConnectionOverview", () => {
  it("keeps Z-API discoverable when contracted capacity is not active", async () => {
    const overview = await getCrmChannelConnectionOverview(
      createContext(["crm"]),
      createPorts(0),
    );

    expect(overview.allowance).toEqual({ limit: 0, remaining: 0, used: 0 });
    expect(overview.availableSetups).toEqual([
      { broker: "direct", channel: "whatsapp", provider: "zapi" },
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
    ]);
  });

  it("keeps Z-API discoverable without entitlement or capacity", async () => {
    const withoutCapacity = await getCrmChannelConnectionOverview(
      createContext(["crm", "crm_zapi"]),
      createPorts(0),
    );
    const withoutEntitlement = await getCrmChannelConnectionOverview(
      createContext(["crm"]),
      createPorts(1),
    );

    expect(withoutCapacity.availableSetups).toEqual([
      { broker: "direct", channel: "whatsapp", provider: "zapi" },
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
    ]);
    expect(withoutEntitlement.availableSetups).toEqual([
      { broker: "direct", channel: "whatsapp", provider: "zapi" },
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
    ]);
  });
});

function createContext(entitlements: ("crm" | "crm_zapi")[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    entitlements,
    permissions: ["crm.conversations.read"],
    request: { requestId: "request_1" },
    storeId,
    tenantId,
  });
}

function createPorts(limit: number): CrmServicePorts {
  return {
    billingQuotaGuard: {
      assertAvailable: vi.fn(async () => undefined),
      getAllowance: vi.fn(async () => ({
        limit,
        remaining: limit,
        used: 0,
      })),
    },
    crmConnectionRepository: createTestCrmConnectionRepository(),
    crmRepository: {} as never,
  };
}
