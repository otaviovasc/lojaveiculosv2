import { describe, expect, it, vi } from "vitest";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import type { FinancingProviderGateway } from "../../ports/financingProviderGateway.js";
import { getFinancingReadiness } from "./readinessService.js";
import { createCredereSimulation } from "./simulationCreateService.js";
import { listCredereSimulations } from "./simulationService.js";
import {
  createPorts,
  createStoreContext,
  fixedNow,
  pendingSimulation,
  simulationInput,
} from "./testSupport.js";
describe("Financing simulation service", () => {
  it("uses only the context store and does not enumerate siblings", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping({
      providerStoreId: "credere_store_sibling",
      providerStoreName: "Sibling Store",
      storeId: "store_3" as never,
    });

    const readiness = await getFinancingReadiness(
      createStoreContext(["financing.simulation.read"], { storeId: "store_2" }),
      createPorts(repository),
    );
    const listed = await listCredereSimulations(
      createStoreContext(["financing.simulation.read"], { storeId: "store_2" }),
      {},
      createPorts(repository),
    );

    expect(readiness).toMatchObject({
      canCreateSimulation: false,
      configured: true,
      connected: true,
      mapped: false,
      mappedStoreAlias: null,
      provider: "credere",
      usableBankCount: 0,
      usableBanks: [],
      unavailableBankCount: 0,
      unavailableBanks: [],
    });
    expect(JSON.stringify(readiness)).not.toContain("store_1");
    expect(JSON.stringify(readiness)).not.toContain("Sibling Store");
    expect(listed).toEqual([]);
  });

  it("builds readiness from live integrated banks and server policy", async () => {
    const repository = createMemoryFinancingRepository({
      bankPolicy: ["655", "623"],
    });
    repository.seedConnection();
    repository.seedStoreMapping({ providerStoreName: "Loja Credere" });
    const listIntegratedBanks = vi.fn(async () => [
      {
        active: true,
        code: "655",
        name: "BV",
        status: "okay",
        tradename: "BV",
      },
      {
        active: true,
        code: "999",
        name: "Other",
        status: "okay",
        tradename: null,
      },
      {
        active: false,
        code: "623",
        name: "PAN",
        status: "okay",
        tradename: "PAN",
      },
    ]);

    await expect(
      getFinancingReadiness(
        createStoreContext(["financing.simulation.read"]),
        createPorts(repository, { listIntegratedBanks }),
      ),
    ).resolves.toMatchObject({
      canCreateSimulation: true,
      mappedStoreAlias: "Loja Credere",
      usableBankCount: 1,
      usableBanks: [{ code: "655", name: "BV" }],
      unavailableBankCount: 1,
      unavailableBanks: [{ code: "623", name: "PAN", reason: "inactive" }],
    });
    expect(listIntegratedBanks).toHaveBeenCalledWith(
      expect.objectContaining({ credereStoreId: "credere_store_1" }),
    );
  });

  it("fails before outbound simulation when the current store is unmapped", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput(),
        createPorts(repository, { createSimulation }),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it("intersects active banks, server policy, and requested banks fail-closed", async () => {
    const repository = createMemoryFinancingRepository({ bankPolicy: ["655"] });
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({ bankCodes: ["999"] }),
        createPorts(repository, { createSimulation }),
      ),
    ).rejects.toThrow("No usable financing banks");
    expect(createSimulation).not.toHaveBeenCalled();

    await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({
        bankCodes: ["655"],
        idempotencyKey: "idem_bank_allowed",
      }),
      createPorts(repository, {
        createSimulation: vi.fn(async () =>
          pendingSimulation("credere_inquiry_1"),
        ),
      }),
    );
    expect(repository.inspect().inquiries[0]?.bankCodes).toEqual(["655"]);
  });

  it("requires consent before persisting an inquiry or calling the provider", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({ consent: { accepted: false, termsVersion: "v1" } }),
        createPorts(repository, { createSimulation }),
      ),
    ).rejects.toThrow("Explicit financing simulation consent is required");
    expect(repository.inspect().inquiries).toEqual([]);
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it("derives seller CPF and vehicle model before provider simulation POST", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    const mapping = repository.seedStoreMapping();
    const createInquiry = vi.spyOn(repository, "createInquiry");
    const createSimulation = vi.fn<
      FinancingProviderGateway["createSimulation"]
    >(async () => ({
      conditions: [
        {
          available: true,
          bankCode: "655",
          bankName: "BV",
          downPaymentCents: 1_000_000,
          financedAmountCents: 4_000_000,
          firstInstallmentCents: 100_000,
          id: "condition_1",
          installments: 48,
          preApprovalStatus: 1,
          reason: "Approved",
          reasonIdentifier: null,
          status: "available" as const,
        },
      ],
      createdAt: fixedNow.toISOString(),
      providerRequestId: "provider_request_1",
      reason: null,
      status: "completed" as const,
      success: true,
      uuid: "credere_inquiry_1",
    }));
    const inquiry = await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({ idempotencyKey: "idem_derived_provider_fields" }),
      createPorts(repository, { createSimulation }),
    );

    const [simulationRequest] = createSimulation.mock.calls.at(0) ?? [];
    const [inquiryRequest] = createInquiry.mock.calls.at(0) ?? [];
    expect(simulationRequest).toBeDefined();
    expect(inquiryRequest?.storeMappingId).toBe(mapping.id);
    expect(simulationRequest).toMatchObject({
      simulation: {
        conditions: [{ financedAmountCents: 4_000_000 }],
        sellerCpf: "98765432100",
        vehicle: {
          credereVehicleModelId: "model_1",
        },
      },
    });
    expect(JSON.stringify(repository.inspect().inquiries)).not.toContain(
      "98765432100",
    );
    expect(inquiry.status).toBe("completed");
    expect(inquiry).toMatchObject({
      providerRequestId: "provider_request_1",
      success: true,
    });
  });

  it("preserves a failed provider outcome without reclassifying it as pending", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();

    const inquiry = await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({ idempotencyKey: "idem_provider_failed" }),
      createPorts(repository, {
        createSimulation: vi.fn(async () => ({
          conditions: [],
          createdAt: fixedNow.toISOString(),
          providerRequestId: "provider_request_failed",
          reason: "Provider rejected the request.",
          status: "failed" as const,
          success: false,
          uuid: "credere_inquiry_failed",
        })),
      }),
    );

    expect(inquiry).toMatchObject({
      providerRequestId: "provider_request_failed",
      reason: "Provider rejected the request.",
      status: "failed",
      success: false,
    });
  });
});
