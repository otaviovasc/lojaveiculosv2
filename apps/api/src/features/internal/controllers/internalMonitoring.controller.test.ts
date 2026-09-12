import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createInternalMonitoringFeature } from "./internalMonitoring.controller.js";

describe("internal monitoring controller", () => {
  it("keeps store-scoped health available to scoped audit readers", async () => {
    const feature = createInternalMonitoringFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "store_user", kind: "user" },
          permissions: ["audit.read"],
          request: { requestId: "request_store_health" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
    });

    const response = await feature.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ status: "healthy" }),
    );
  });

  it("denies platform health to an unscoped audit reader", async () => {
    const feature = createInternalMonitoringFeature({
      accountContextFactory: async () =>
        createServiceContext({
          actor: { id: "owner_user", kind: "user" },
          permissions: ["audit.read"],
          request: { requestId: "request_owner_health" },
        }),
    });

    const response = await feature.request("/platform/health");

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(
      expect.objectContaining({ code: "AUTHORIZATION_DENIED" }),
    );
  });

  it("serves platform health to an active platform administrator", async () => {
    const platformContext = createServiceContext({
      actor: { id: "platform_user", kind: "user" },
      permissions: ["audit.read"],
      request: { requestId: "request_platform_health" },
    });
    const feature = createInternalMonitoringFeature({
      accountContextFactory: async () => ({
        ...platformContext,
        platformAdmin: true,
      }),
    });

    const response = await feature.request("/platform/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ status: "healthy" }),
    );
  });
});
