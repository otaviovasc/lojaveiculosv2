import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getWhatsappConnectionOverview } from "./listWhatsappConnections.js";

const storeId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

describe("getWhatsappConnectionOverview", () => {
  it("offers Official WhatsApp when Z-API has no contracted capacity", async () => {
    const overview = await getWhatsappConnectionOverview(
      createContext(["crm"]),
      createPorts(0),
    );

    expect(overview.allowance).toEqual({ limit: 0, remaining: 0, used: 0 });
    expect(overview.availableProviders).toEqual(["composio_whatsapp"]);
  });

  it("does not offer Z-API without both entitlement and contracted capacity", async () => {
    const withoutCapacity = await getWhatsappConnectionOverview(
      createContext(["crm", "crm_zapi"]),
      createPorts(0),
    );
    const withoutEntitlement = await getWhatsappConnectionOverview(
      createContext(["crm"]),
      createPorts(1),
    );

    expect(withoutCapacity.availableProviders).toEqual(["composio_whatsapp"]);
    expect(withoutEntitlement.availableProviders).toEqual([
      "composio_whatsapp",
    ]);
  });
});

function createContext(entitlements: ("crm" | "crm_zapi")[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    entitlements,
    permissions: ["crm.whatsapp.list"],
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
