import { describe, expect, it, vi } from "vitest";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { disconnectFinancingProvider } from "./connectionOverviewService.js";
import {
  completeFinancingOAuthCallback,
  startFinancingOAuthTransaction,
} from "./oauthConnectionService.js";
import {
  discoverCredereProviderStores,
  mapCredereStore,
} from "./storeMappingService.js";
import {
  createAgencyContext,
  createPorts,
  fixedNow,
  tokenSet,
} from "./testSupport.js";

describe("Financing connection service", () => {
  it("persists OAuth state as a hash, uses PKCE, and rejects replay", async () => {
    const repository = createMemoryFinancingRepository();
    const exchangeAuthorizationCode = vi.fn(async () => tokenSet());
    const ports = createPorts(repository, {
      exchangeAuthorizationCode,
      supportsPkce: true,
    });
    const context = createAgencyContext();

    const started = await startFinancingOAuthTransaction(context, ports);
    const [transaction] = repository.inspect().oauthTransactions;

    expect(transaction?.stateHash).toHaveLength(64);
    expect(transaction?.stateHash).not.toBe(started.state);
    expect(transaction?.codeVerifier).toEqual(expect.any(String));
    expect(transaction?.requestedByUserId).toBe("user_agency");
    expect(started.callbackUri).toBe(
      "/api/v1/financing/credere/oauth/callback",
    );
    expect(started.usesPkce).toBe(true);

    const completed = await completeFinancingOAuthCallback(
      context,
      { code: "oauth_code_1", state: started.state },
      ports,
    );

    expect(exchangeAuthorizationCode).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "oauth_code_1",
        codeVerifier: transaction?.codeVerifier,
        redirectUri: "/api/v1/financing/credere/oauth/callback",
      }),
    );
    expect(completed.token).toBeNull();
    await expect(
      completeFinancingOAuthCallback(
        context,
        { code: "oauth_code_2", state: started.state },
        ports,
      ),
    ).rejects.toThrow("Financing OAuth state is invalid");
  });

  it("rejects expired OAuth state", async () => {
    const repository = createMemoryFinancingRepository();
    const context = createAgencyContext();
    const started = await startFinancingOAuthTransaction(
      context,
      createPorts(repository, { supportsPkce: false }),
    );

    await expect(
      completeFinancingOAuthCallback(
        context,
        { code: "oauth_code_1", state: started.state },
        createPorts(repository, {
          clock: () => new Date(fixedNow.getTime() + 11 * 60_000),
        }),
      ),
    ).rejects.toThrow("Financing OAuth state is invalid");
  });

  it("maps a requested tenant store without store-scoped entitlement", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();

    const mapping = await mapCredereStore(
      createAgencyContext(),
      { providerStoreId: "credere_store_1", storeId: "store_1" },
      createPorts(repository),
    );

    expect(mapping).toMatchObject({
      providerStoreId: "credere_store_1",
      providerStoreName: "Credere Matriz",
      storeId: "store_1",
    });
  });

  it("rejects agency mapping when the requested store is outside the tenant", async () => {
    const repository = createMemoryFinancingRepository({
      tenantStores: [{ storeId: "store_1", tenantId: "tenant_1" }],
    });
    repository.seedConnection();

    await expect(
      mapCredereStore(
        createAgencyContext(),
        { providerStoreId: "credere_store_1", storeId: "store_999" },
        createPorts(repository),
      ),
    ).rejects.toThrow("Store does not belong to financing tenant");
    expect(repository.inspect().storeMappings).toEqual([]);
  });

  it("rejects mapping a provider store already assigned to another local store", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping({
      providerStoreId: "credere_store_1",
      storeId: "store_1" as never,
    });

    await expect(
      mapCredereStore(
        createAgencyContext(),
        { providerStoreId: "credere_store_1", storeId: "store_2" },
        createPorts(repository),
      ),
    ).rejects.toThrow("Provider store is already mapped");
  });

  it("revokes provider token on disconnect and clears local token on revoke failure", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    const revokeToken = vi.fn(async () => undefined);

    await disconnectFinancingProvider(
      createAgencyContext(),
      createPorts(repository, { revokeToken }),
    );

    expect(revokeToken).toHaveBeenCalledWith("access_token_1");
    expect(repository.inspect().connections[0]?.token).toBeNull();

    repository.seedConnection();
    const failedRevoke = vi.fn(async () => {
      throw new Error("provider_revoke_failed_with_safe_message");
    });
    await expect(
      disconnectFinancingProvider(
        createAgencyContext(),
        createPorts(repository, { revokeToken: failedRevoke }),
      ),
    ).resolves.toMatchObject({ token: null });
    expect(repository.inspect().connections[0]?.status).toBe("disconnected");
  });

  it("discovers provider sub-stores only for connection managers", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    const listStores = vi.fn(async () => [
      {
        cnpj: "00.000.000/0001-00",
        displayName: "Credere Matriz",
        id: "credere_store_1",
        name: "Credere Matriz",
      },
    ]);
    const ports = createPorts(repository, { listStores });

    await expect(
      discoverCredereProviderStores(
        createAgencyContext(["financing.simulation.read"]),
        ports,
      ),
    ).rejects.toThrow("Missing permission: financing.connection.manage");

    await expect(
      discoverCredereProviderStores(createAgencyContext(), ports),
    ).resolves.toHaveLength(1);
  });
});
