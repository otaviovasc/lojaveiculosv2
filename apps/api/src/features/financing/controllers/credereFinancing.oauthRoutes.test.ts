import { describe, expect, it, vi } from "vitest";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createServices,
  createStoreApp,
} from "./credereFinancing.controller.testSupport.js";

describe("Credere OAuth callback controller", () => {
  it("uses only opaque callback state and an explicit public context", async () => {
    const completeCallback = vi.fn(
      async (
        _context: ServiceContext,
        _input:
          { code: string; state: string } | { error: string; state: string },
      ) => ({ ok: true }),
    );
    const services = createServices({ oauth: { completeCallback } });

    const response = await createStoreApp(services).request(
      "/api/v1/financing/credere/oauth/callback?code=oauth_code&state=opaque_state&tenantId=tenant_bad&storeId=store_bad",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      provider: "credere",
      status: "connected",
    });
    expect(completeCallback).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { id: "public", kind: "public" } }),
      { code: "oauth_code", state: "opaque_state" },
    );
    expect(completeCallback.mock.calls[0]?.[0].permissions).toContain(
      "financing.oauth.callback",
    );
  });

  it("handles provider denial without accepting provider descriptions", async () => {
    const completeCallback = vi.fn(async () => ({ kind: "cancelled" }));
    const services = createServices({ oauth: { completeCallback } });
    const response = await createStoreApp(services).request(
      "/api/v1/financing/credere/oauth/callback?error=access_denied&error_description=raw_provider_text&state=opaque_state",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: false,
      provider: "credere",
      status: "cancelled",
    });
    expect(completeCallback).toHaveBeenCalledWith(expect.anything(), {
      error: "access_denied",
      state: "opaque_state",
    });
  });
});
