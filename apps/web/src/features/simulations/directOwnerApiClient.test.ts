import { describe, expect, it, vi } from "vitest";
import { createCredereApi } from "./apiClient";

describe("direct owner Credere API client", () => {
  it("uses store-scoped connection routes without sending local store ids", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (input) => {
        const url = String(input);
        if (url.endsWith("/connection")) {
          return jsonResponse({
            connected: true,
            configured: true,
            storeMapping: { externalStoreId: "external_1" },
          });
        }
        if (url.endsWith("/oauth/start")) {
          return jsonResponse({
            authorizationUrl: "https://credere.test/auth",
          });
        }
        if (url.endsWith("/provider-stores")) {
          return jsonResponse({
            stores: [{ externalStoreId: "external_1", name: "Credere Loja" }],
          });
        }
        return jsonResponse({ externalStoreId: "external_1" });
      });
    const api = createCredereApi({ fetch });

    const connection = await api.getConnection();
    const oauth = await api.startOAuth();
    const stores = await api.listProviderStores();
    const mapping = await api.mapStore("external_1");
    await api.unmapStore();
    await api.disconnectConnection();

    expect(connection.storeMapping?.externalStoreId).toBe("external_1");
    expect(oauth.authorizationUrl).toBe("https://credere.test/auth");
    expect(stores[0]?.externalStoreId).toBe("external_1");
    expect(mapping.externalStoreId).toBe("external_1");
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/financing/credere/connection",
      "/api/v1/financing/credere/oauth/start",
      "/api/v1/financing/credere/provider-stores",
      "/api/v1/financing/credere/store-mapping",
      "/api/v1/financing/credere/store-mapping",
      "/api/v1/financing/credere/connection",
    ]);
    const mapBody = JSON.parse(
      String(fetch.mock.calls[3]?.[1]?.body),
    ) as unknown;
    expect(mapBody).toEqual({ externalStoreId: "external_1" });
    expect(mapBody).not.toHaveProperty("storeId");
    expect(mapBody).not.toHaveProperty("tenantId");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
