import { describe, expect, it, vi } from "vitest";
import { createCredereApi } from "./apiClient";

describe("createCredereApi direct owner connection routes", () => {
  it("uses connection management routes without local store ids", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.endsWith("/connection") && init?.method !== "DELETE") {
          return jsonResponse({
            connected: true,
            configured: true,
            storeMapping: {
              externalStoreAlias: "Credere Centro",
              externalStoreId: "external_1",
              storeId: "store_secret",
            },
            tokenPreview: "tok_secret",
          });
        }
        if (url.endsWith("/provider-stores")) {
          return jsonResponse({
            stores: [{ externalStoreId: "external_1", name: "Credere Centro" }],
          });
        }
        if (url.endsWith("/oauth/start")) {
          return jsonResponse({
            authorizationUrl: "https://credere.example/auth",
          });
        }
        return jsonResponse({ ok: true, externalStoreId: "external_1" });
      });
    const api = createCredereApi({ fetch });

    const connection = await api.getConnection();
    const providers = await api.listProviderStores();
    const oauth = await api.startOAuth();
    await api.mapStore("external_1");
    await api.unmapStore();
    await api.disconnectConnection();

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/financing/credere/connection",
      "/api/v1/financing/credere/provider-stores",
      "/api/v1/financing/credere/oauth/start",
      "/api/v1/financing/credere/store-mapping",
      "/api/v1/financing/credere/store-mapping",
      "/api/v1/financing/credere/connection",
    ]);
    expect(JSON.parse(String(fetch.mock.calls[3]?.[1]?.body))).toEqual({
      externalStoreId: "external_1",
    });
    expect(fetch.mock.calls[4]?.[1]?.method).toBe("DELETE");
    expect(fetch.mock.calls[5]?.[1]?.method).toBe("DELETE");
    expect(connection.storeMapping).toEqual({
      externalStoreAlias: "Credere Centro",
      externalStoreId: "external_1",
    });
    expect(JSON.stringify(connection)).not.toContain("store_secret");
    expect(JSON.stringify(connection)).not.toContain("tok_secret");
    expect(providers[0]).toMatchObject({
      externalStoreId: "external_1",
      name: "Credere Centro",
    });
    expect(oauth.authorizationUrl).toBe("https://credere.example/auth");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
