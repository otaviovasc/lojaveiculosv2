import { describe, expect, it, vi } from "vitest";
import { FinancingProviderGatewayError } from "../../ports/financingProviderGateway.js";
import { getUsableProviderConnection } from "../../support/tokenConnectionSupport.js";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { createCredereSimulation } from "./simulationCreateService.js";
import { pollCredereSimulation } from "./simulationService.js";
import {
  createPorts,
  createStoreContext,
  fixedNow,
  pendingSimulation,
  simulationInput,
  tokenSet,
} from "./testSupport.js";

describe("Financing simulation reliability", () => {
  it("recovers an abandoned idempotency reservation after its lease expires", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createInquiry = repository.createInquiry;
    let failOnce = true;
    repository.createInquiry = async (input) => {
      if (failOnce) {
        failOnce = false;
        throw new Error("temporary inquiry persistence failure");
      }
      return createInquiry(input);
    };
    let clock = fixedNow;
    const ports = createPorts(repository, { clock: () => clock });
    const context = createStoreContext(["financing.simulation.create"]);
    const input = simulationInput({ idempotencyKey: "idem_recover_lease" });

    await expect(
      createCredereSimulation(context, input, ports),
    ).rejects.toThrow("temporary inquiry persistence failure");
    await expect(
      createCredereSimulation(context, input, ports),
    ).rejects.toMatchObject({ statusCode: 409 });
    clock = new Date(fixedNow.getTime() + 61_000);
    await expect(
      createCredereSimulation(context, input, ports),
    ).resolves.toMatchObject({ idempotencyKey: "idem_recover_lease" });
  });

  it("reconciles one exact recent provider candidate", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    let candidateCreatedAt = fixedNow.toISOString();
    const ports = createPorts(repository, {
      createSimulation: vi.fn(async () => {
        throw indeterminateError();
      }),
      getSimulation: vi.fn(async () =>
        pendingSimulation("credere_reconciled_1"),
      ),
      listSimulationCandidates: vi.fn(async () => [
        {
          assetValueCents: 6_000_000,
          createdAt: candidateCreatedAt,
          customerDocumentHash:
            "254aa248acb47dd654ca3ea53f48c2c26d641d23d7e2e93a1ec56258df7674c4",
          manufactureYear: 2022,
          modelYear: 2023,
          vehicleMolicarCode: "01906108-0",
          uuid: "credere_reconciled_1",
        },
      ]),
    });
    const indeterminate = await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({ idempotencyKey: "idem_reconcile" }),
      ports,
    );
    candidateCreatedAt = indeterminate.createdAt.toISOString();

    await expect(
      pollCredereSimulation(
        createStoreContext(["financing.simulation.read"]),
        { inquiryId: indeterminate.id },
        ports,
      ),
    ).resolves.toMatchObject({
      providerInquiryId: "credere_reconciled_1",
      status: "submitted",
    });
  });

  it("keeps the inquiry indeterminate when reconciliation is ambiguous", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const indeterminate = await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({ idempotencyKey: "idem_ambiguous" }),
      createPorts(repository, {
        createSimulation: vi.fn(async () => {
          throw indeterminateError();
        }),
      }),
    );
    const candidate = {
      assetValueCents: 6_000_000,
      createdAt: indeterminate.createdAt.toISOString(),
      customerDocumentHash: indeterminate.customerDocumentHash,
      manufactureYear: 2022,
      modelYear: 2023,
      vehicleMolicarCode: "01906108-0",
    };
    const getSimulation = vi.fn();
    const refreshed = await pollCredereSimulation(
      createStoreContext(["financing.simulation.read"]),
      { inquiryId: indeterminate.id },
      createPorts(repository, {
        getSimulation,
        listSimulationCandidates: async () => [
          { ...candidate, uuid: "candidate_1" },
          { ...candidate, uuid: "candidate_2" },
        ],
      }),
    );

    expect(refreshed).toEqual(indeterminate);
    expect(getSimulation).not.toHaveBeenCalled();
  });

  it("settles concurrent refresh rotation on the single CAS winner", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection({
      token: {
        ...tokenSet(),
        expiresAt: new Date(fixedNow.getTime() - 1_000),
      },
    });
    const releases: Array<() => void> = [];
    let sequence = 0;
    const refreshToken = vi.fn(
      async () =>
        new Promise<ReturnType<typeof tokenSet>>((resolve) => {
          const current = ++sequence;
          releases.push(() =>
            resolve({
              ...tokenSet(),
              accessToken: `access_token_${current + 1}`,
              refreshToken: `refresh_token_${current + 1}`,
            }),
          );
        }),
    );
    const ports = createPorts(repository, { refreshToken });
    const input = {
      provider: "credere" as const,
      tenantId: "tenant_1" as never,
    };

    const first = getUsableProviderConnection(input, ports);
    const second = getUsableProviderConnection(input, ports);
    await vi.waitFor(() => expect(releases).toHaveLength(2));
    releases[0]?.();
    releases[1]?.();

    const settled = await Promise.all([first, second]);
    expect(settled.map((item) => item.token?.accessToken)).toEqual([
      "access_token_2",
      "access_token_2",
    ]);
    expect(repository.inspect().connections[0]?.token?.accessToken).toBe(
      "access_token_2",
    );
  });
});

function indeterminateError() {
  return new FinancingProviderGatewayError(
    "indeterminate",
    "Credere request outcome is indeterminate.",
    202,
  );
}
