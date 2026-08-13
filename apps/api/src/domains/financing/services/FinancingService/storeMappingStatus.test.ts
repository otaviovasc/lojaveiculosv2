import { describe, expect, it, vi } from "vitest";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { mapCredereStore } from "./storeMappingService.js";
import { createAgencyContext, createPorts } from "./testSupport.js";

function providerStore(status: string | null) {
  return {
    cnpj: "00.000.000/0001-00",
    displayName: "Credere Matriz",
    id: "credere_store_1",
    name: "Credere Matriz",
    status,
  };
}

describe("Credere store mapping status", () => {
  it("maps a store when Credere omits its status", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    const ports = createPorts(repository, {
      listStores: vi.fn(async () => [providerStore(null)]),
    });

    await expect(
      mapCredereStore(
        createAgencyContext(),
        { providerStoreId: "credere_store_1", storeId: "store_1" },
        ports,
      ),
    ).resolves.toMatchObject({
      providerStoreId: "credere_store_1",
      storeId: "store_1",
    });
  });

  it("rejects an unrecognized explicit provider store status", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    const ports = createPorts(repository, {
      listStores: vi.fn(async () => [providerStore("blocked")]),
    });

    await expect(
      mapCredereStore(
        createAgencyContext(),
        { providerStoreId: "credere_store_1", storeId: "store_1" },
        ports,
      ),
    ).rejects.toThrow("Provider store is not available");
  });
});
