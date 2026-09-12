import { describe, expect, it, vi } from "vitest";
import type { FinancingSimulation } from "../../ports/financingProviderGateway.js";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { syncCredereSimulations } from "./simulationSyncService.js";
import { createPorts, createStoreContext, fixedNow } from "./testSupport.js";

function candidate(uuid: string) {
  return {
    assetValueCents: 6_000_000,
    createdAt: "2026-07-20T15:00:00.000Z",
    customerDocumentHash: "a".repeat(64),
    manufactureYear: 2022,
    modelYear: 2023,
    vehicleMolicarCode: "01906108-0",
    uuid,
  };
}

function completedSimulation(uuid: string): FinancingSimulation {
  return {
    conditions: [
      {
        available: true,
        bankCode: "655",
        bankName: "BV",
        downPaymentCents: 1_000_000,
        financedAmountCents: 5_000_000,
        firstInstallmentCents: 120_000,
        id: "condition_1",
        installments: 48,
        preApprovalStatus: 1,
        reason: null,
        reasonIdentifier: null,
        status: "available" as const,
      },
    ],
    createdAt: "2026-07-20T15:00:00.000Z",
    providerRequestId: "provider_request_1",
    reason: null,
    status: "completed" as const,
    success: true,
    uuid,
  };
}

describe("Financing simulation sync service", () => {
  it("backfills remote simulations missing locally and lists them", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const ports = createPorts(repository, {
      getSimulation: vi.fn(async ({ uuid }: { uuid: string }) =>
        completedSimulation(uuid),
      ),
      listSimulationCandidates: vi.fn(async () => [
        candidate("credere_sim_1"),
        candidate("credere_sim_2"),
      ]),
    });

    const result = await syncCredereSimulations(
      createStoreContext(["financing.simulation.read"]),
      {},
      ports,
    );

    expect(result).toMatchObject({
      created: 2,
      remoteCount: 2,
      skipped: 0,
      updated: 0,
    });
    const inquiries = repository.inspect().inquiries;
    expect(inquiries).toHaveLength(2);
    expect(inquiries.map((item) => item.providerInquiryId).sort()).toEqual([
      "credere_sim_1",
      "credere_sim_2",
    ]);
    const stored = inquiries.find(
      (item) => item.providerInquiryId === "credere_sim_1",
    )!;
    expect(stored).toMatchObject({
      amountCents: 6_000_000,
      consentEvidence: null,
      downPaymentCents: 1_000_000,
      installments: null,
      provider: "credere",
      providerStoreId: "credere_store_1",
      status: "completed",
      storeId: "store_1",
      success: true,
      tenantId: "tenant_1",
    });
    expect(stored.createdAt.toISOString()).toBe("2026-07-20T15:00:00.000Z");
    expect(stored.metadata.backfilledFromProvider).toBe(true);
    expect(stored.conditions).toHaveLength(1);
    expect(stored.conditions[0]).toMatchObject({
      bankCode: "655",
      installments: 48,
      status: "available",
    });
    const listed = await repository.listInquiries({
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    expect(listed).toHaveLength(2);
  });

  it("is idempotent and skips terminal inquiries on subsequent runs", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const getSimulation = vi.fn(async ({ uuid }: { uuid: string }) =>
      completedSimulation(uuid),
    );
    const ports = createPorts(repository, {
      getSimulation,
      listSimulationCandidates: vi.fn(async () => [candidate("credere_sim_1")]),
    });
    const context = () => createStoreContext(["financing.simulation.read"]);

    const first = await syncCredereSimulations(context(), {}, ports);
    const second = await syncCredereSimulations(context(), {}, ports);

    expect(first).toMatchObject({ created: 1, updated: 0 });
    expect(second).toMatchObject({ created: 0, skipped: 1, updated: 0 });
    expect(getSimulation).toHaveBeenCalledTimes(1);
    expect(repository.inspect().inquiries).toHaveLength(1);
  });

  it("refreshes a non-terminal local inquiry from the provider", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const syncPorts = createPorts(repository, {
      listSimulationCandidates: vi.fn(async () => [candidate("credere_sim_1")]),
    });
    await repository.upsertProviderInquiry({
      amountCents: 4_000_000,
      bankCodes: ["623"],
      completedAt: null,
      conditions: [],
      createdAt: fixedNow,
      customerDocumentHash: "a".repeat(64),
      customerDocumentLast4: null,
      downPaymentCents: 800_000,
      installments: 36,
      metadata: {},
      provider: "credere",
      providerInquiryId: "credere_sim_1",
      providerRequestId: null,
      providerStoreId: "credere_store_1",
      reason: null,
      status: "submitted",
      storeId: "store_1" as never,
      storeMappingId: repository.inspect().storeMappings[0]!.id,
      success: null,
      tenantId: "tenant_1" as never,
    });

    const result = await syncCredereSimulations(
      createStoreContext(["financing.simulation.read"]),
      {},
      createPorts(repository, {
        getSimulation: vi.fn(async () => completedSimulation("credere_sim_1")),
        listSimulationCandidates: syncPorts.gateway!.listSimulationCandidates,
      }),
    );

    expect(result).toMatchObject({ created: 0, skipped: 0, updated: 1 });
    expect(repository.inspect().inquiries).toHaveLength(1);
    expect(repository.inspect().inquiries[0]).toMatchObject({
      amountCents: 4_000_000,
      bankCodes: ["623"],
      downPaymentCents: 800_000,
      installments: 36,
      status: "completed",
      success: true,
    });
  });

  it("does not invent zero installments for incomplete provider conditions", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const simulation = completedSimulation("credere_sim_1");
    simulation.conditions[0]!.installments = null;
    simulation.conditions[0]!.downPaymentCents = null;

    await syncCredereSimulations(
      createStoreContext(["financing.simulation.read"]),
      {},
      createPorts(repository, {
        getSimulation: vi.fn(async () => simulation),
        listSimulationCandidates: vi.fn(async () => [
          candidate("credere_sim_1"),
        ]),
      }),
    );

    expect(repository.inspect().inquiries[0]).toMatchObject({
      conditions: [],
      consentEvidence: null,
      downPaymentCents: null,
      installments: null,
    });
  });

  it("returns an empty result without a store mapping", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    const listSimulationCandidates = vi.fn(async () => [candidate("x")]);
    const result = await syncCredereSimulations(
      createStoreContext(["financing.simulation.read"]),
      {},
      createPorts(repository, { listSimulationCandidates }),
    );

    expect(result).toMatchObject({
      created: 0,
      remoteCount: 0,
      skipped: 0,
      updated: 0,
    });
    expect(listSimulationCandidates).not.toHaveBeenCalled();
  });

  it("requires the simulation read permission", async () => {
    const repository = createMemoryFinancingRepository();
    await expect(
      syncCredereSimulations(
        createStoreContext([]),
        {},
        createPorts(repository),
      ),
    ).rejects.toThrow();
  });
});
