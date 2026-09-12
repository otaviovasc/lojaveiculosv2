import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { persistReadyChannelDefault } from "./persistInitialReadyChannelDefault.js";

describe("persistReadyChannelDefault", () => {
  it("defers routing failure without turning a ready provider effect into failure", async () => {
    const context = createServiceContext({
      actor: { id: "actor-1", kind: "user" },
      entitlements: ["crm"],
      permissions: ["crm.messaging.connection.setup"],
      request: { requestId: "request-1" },
      storeId: "store-1",
      tenantId: "tenant-1",
    });
    const warn = vi.spyOn(context.logger, "warn");
    const ports: CrmServicePorts = {
      crmRepository: {} as never,
      crmRoutingConnectionRepository: {
        listConnections: async () => {
          throw new TypeError("routing persistence unavailable");
        },
      },
      crmRoutingPolicyRepository: {
        createDefaultIfMissing: vi.fn(),
        listPolicies: vi.fn(async () => []),
        upsertPolicy: vi.fn(),
      },
    };
    ports.transaction = async (action) => action(ports);

    await expect(
      persistReadyChannelDefault(
        context,
        {
          capabilities: ["outbound"],
          channel: "whatsapp",
          displayName: "WhatsApp",
          id: "first-ready",
          isDefault: false,
          provider: "zapi",
          readiness: { ready: true, reason: null, reasonCode: "ready" },
          ready: true,
          state: "active",
        } as never,
        ports,
      ),
    ).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(
      "crm.routing.policy.default.deferred",
      expect.objectContaining({ connectionId: "first-ready" }),
    );
  });
});
