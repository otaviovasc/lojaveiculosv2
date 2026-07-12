import { describe, expect, it } from "vitest";
import {
  agencyTenantId,
  createFeature,
  createRepository,
} from "./accountProvisioning.controller.testSupport.js";

describe("agency store provisioning route", () => {
  it("creates stores inside the requested tenant context", async () => {
    const repository = createRepository();
    const app = createFeature(repository);

    const response = await requestAgencyStore(app);

    expect(response.status).toBe(201);
    expect(repository.hasActiveTenantRole).toHaveBeenCalledWith({
      role: "agency",
      tenantId: agencyTenantId,
      userId: "user_1",
    });
    expect(repository.createAgencyStore).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: agencyTenantId }),
    );
  });

  it("returns the stable authorization envelope for another tenant", async () => {
    const repository = createRepository({
      platformAdmin: false,
      tenantAgency: false,
    });
    const app = createFeature(repository);

    const response = await requestAgencyStore(app);

    expect(response.status).toBe(403);
    const body = (await response.json()) as {
      code?: unknown;
      requestId?: unknown;
    };
    expect(body.code).toBe("AUTHORIZATION_DENIED");
    expect(typeof body.requestId).toBe("string");
    expect(repository.createAgencyStore).not.toHaveBeenCalled();
  });
});

function requestAgencyStore(app: ReturnType<typeof createFeature>) {
  return app.request("/agency/stores", {
    body: JSON.stringify({
      publicSlug: "auto-prime",
      storeTradingName: "Auto Prime",
      tenantId: agencyTenantId,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}
