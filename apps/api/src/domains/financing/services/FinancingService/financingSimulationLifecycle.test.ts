import { describe, expect, it, vi } from "vitest";
import { createMemoryFinancingRepository } from "../../testing/financingRepository.js";
import { FinancingProviderGatewayError } from "../../ports/financingProviderGateway.js";
import { createCredereSimulation } from "./simulationCreateService.js";
import type { FinancingProviderGateway } from "./serviceSupport.js";
import {
  createPorts,
  createStoreContext,
  fixedNow,
  pendingSimulation,
  simulationInput,
  tokenSet,
} from "./testSupport.js";

describe("Financing simulation lifecycle", () => {
  it("persists an idempotent inquiry before provider create and reuses duplicates", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn(async () => ({
      conditions: [],
      createdAt: "2026-07-27T12:00:00.000Z",
      providerRequestId: "provider_request_1",
      reason: null,
      status: "completed" as const,
      success: true,
      uuid: "credere_inquiry_1",
    }));
    const ports = createPorts(repository, { createSimulation });
    const context = createStoreContext(["financing.simulation.create"]);

    const first = await createCredereSimulation(
      context,
      simulationInput({ idempotencyKey: "idem_same" }),
      ports,
    );
    const second = await createCredereSimulation(
      context,
      simulationInput({ idempotencyKey: "idem_same" }),
      ports,
    );

    expect(first.id).toBe(second.id);
    expect(createSimulation).toHaveBeenCalledTimes(1);
    expect(repository.inspect().operations[0]?.inquiryId).toBe(first.id);
    expect(repository.inspect().inquiries[0]).toMatchObject({
      customerDocumentLast4: "8901",
      providerInquiryId: "credere_inquiry_1",
      status: "completed",
    });
  });

  it("rejects idempotency key reuse with different payloads", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const ports = createPorts(repository);
    const context = createStoreContext(["financing.simulation.create"]);

    await createCredereSimulation(
      context,
      simulationInput({ idempotencyKey: "idem_conflict" }),
      ports,
    );
    await expect(
      createCredereSimulation(
        context,
        simulationInput({
          amountCents: 4_100_000,
          idempotencyKey: "idem_conflict",
        }),
        ports,
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("does not start a second provider write while an identical operation is being prepared", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    vi.spyOn(repository, "reserveSimulationOperation").mockResolvedValue({
      inquiryId: null,
      kind: "duplicate",
      operationId: "operation_in_progress",
    });
    const createInquiry = vi.spyOn(repository, "createInquiry");
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({ idempotencyKey: "idem_in_progress" }),
        createPorts(repository, { createSimulation }),
      ),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(createInquiry).not.toHaveBeenCalled();
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it("enforces simulation permission and entitlement before provider calls", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.read"]),
        simulationInput(),
        createPorts(repository, { createSimulation }),
      ),
    ).rejects.toThrow("Missing permission: financing.simulation.create");

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"], {
          entitlements: [],
        }),
        simulationInput(),
        createPorts(repository, { createSimulation }),
      ),
    ).rejects.toThrow("Missing entitlement: simulations");
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it("marks typed ambiguous provider write outcomes indeterminate without raw PII", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();

    const inquiry = await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput(),
      createPorts(repository, {
        createSimulation: vi.fn(async () => {
          throw new FinancingProviderGatewayError(
            "indeterminate",
            "Credere request outcome is indeterminate.",
            202,
          );
        }),
      }),
    );

    expect(inquiry.status).toBe("indeterminate");
    const persisted = JSON.stringify(repository.inspect().inquiries);
    expect(persisted).not.toContain("ana@example.test");
    expect(persisted).not.toContain("11999999999");
    expect(persisted).not.toContain("12345678901");
    expect(persisted).not.toContain("98765432100");
    expect(persisted).toContain("customerDocumentHash");
    expect(persisted).toContain("customerDocumentLast4");
  });

  it("refreshes an expired provider token before simulation provider calls", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection({
      token: {
        ...tokenSet(),
        expiresAt: new Date(fixedNow.getTime() - 1_000),
      },
    });
    repository.seedStoreMapping();
    const refreshToken = vi.fn(async () => ({
      ...tokenSet(),
      accessToken: "access_token_2",
      refreshToken: null,
    }));
    const createSimulation = vi.fn(
      async (
        input: Parameters<FinancingProviderGateway["createSimulation"]>[0],
      ) => {
        expect(input.token.accessToken).toBe("access_token_2");
        return pendingSimulation("credere_inquiry_refreshed");
      },
    );

    await createCredereSimulation(
      createStoreContext(["financing.simulation.create"]),
      simulationInput({ idempotencyKey: "idem_refresh" }),
      createPorts(repository, { createSimulation, refreshToken }),
    );

    expect(refreshToken).toHaveBeenCalledWith("refresh_token_1");
    expect(repository.inspect().connections[0]?.token?.accessToken).toBe(
      "access_token_2",
    );
    expect(repository.inspect().connections[0]?.token?.refreshToken).toBe(
      "refresh_token_1",
    );
  });

  it("fails closed before provider simulation when seller or model is unavailable", async () => {
    const repository = createMemoryFinancingRepository();
    repository.seedConnection();
    repository.seedStoreMapping();
    const createSimulation = vi.fn();

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({ idempotencyKey: "idem_no_seller" }),
        createPorts(repository, {
          createSimulation,
          listSellers: async () => [],
        }),
      ),
    ).rejects.toThrow("Credere seller is not configured");

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({ idempotencyKey: "idem_no_model" }),
        createPorts(repository, {
          createSimulation,
          lookupVehicleModel: async () => null,
        }),
      ),
    ).rejects.toThrow("Credere vehicle model is not available");

    await expect(
      createCredereSimulation(
        createStoreContext(["financing.simulation.create"]),
        simulationInput({
          idempotencyKey: "idem_inactive_selected_model",
          vehicle: {
            ...simulationInput().vehicle,
            credereVehicleModelId: "model_1",
          },
        }),
        createPorts(repository, {
          createSimulation,
          lookupVehicleModel: async () => ({
            active: false,
            brand: "VW",
            fipeCode: null,
            id: "model_1",
            molicarCode: "01906108-0",
            name: "Gol",
            version: null,
            yearEnd: null,
            yearStart: null,
          }),
        }),
      ),
    ).rejects.toThrow("Credere vehicle model is not available");
    expect(createSimulation).not.toHaveBeenCalled();
  });
});
