import { describe, expect, it, vi } from "vitest";
import {
  createAgencyCredereApi,
  parseConnection,
  parseProviderStores,
} from "./credereApiClient";

describe("createAgencyCredereApi", () => {
  it("maps stores with the agency-only external Credere store id", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const api = createAgencyCredereApi({ fetch: fetchMock as typeof fetch });

    await api.mapStore("tenant_1", "store_1", "credere_store_214");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agency/tenants/tenant_1/financing/credere/store-mappings/store_1",
      expect.objectContaining({
        body: JSON.stringify({ externalStoreId: "credere_store_214" }),
        method: "PUT",
      }),
    );
  });

  it("disconnects the Credere account through the explicit connection route", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const api = createAgencyCredereApi({ fetch: fetchMock as typeof fetch });

    await api.disconnect("tenant_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/agency/tenants/tenant_1/financing/credere/connection",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("agency Credere response parsers", () => {
  it("parses the backend connection presenter without exposing credentials", () => {
    expect(
      parseConnection({
        configured: true,
        connected: true,
        connection: {
          connected: true,
          connectedAt: "2026-07-27T10:00:00.000Z",
          scopes: ["simulator"],
          status: "connected",
          token: "secret",
        },
        storeMappings: [
          {
            externalStoreAlias: "Loja Credere Centro",
            externalStoreId: "214",
            refreshToken: "secret",
            storeId: "store_a",
          },
        ],
      }),
    ).toEqual({
      configured: true,
      connected: true,
      connectedAt: "2026-07-27T10:00:00.000Z",
      connectionStatus: "connected",
      mappings: [
        {
          externalStoreAlias: "Loja Credere Centro",
          externalStoreId: "214",
          storeId: "store_a",
        },
      ],
    });
  });

  it("parses provider sub-stores using the explicit external id", () => {
    expect(
      parseProviderStores({
        stores: [
          {
            document: "***1234",
            externalStoreId: "214",
            name: "Loja Credere Centro",
            status: "active",
          },
        ],
      }),
    ).toEqual([
      {
        document: "***1234",
        externalStoreId: "214",
        name: "Loja Credere Centro",
        status: "active",
      },
    ]);
  });
});
