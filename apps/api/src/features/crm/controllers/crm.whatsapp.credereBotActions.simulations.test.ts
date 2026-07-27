import { describe, expect, it, vi } from "vitest";
import type {
  CrmFinancingBotActions,
  CrmFinancingCreateSimulationInput,
  CrmFinancingGetSimulationInput,
} from "../../../domains/crm/ports/crmFinancingBotActions.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  botActionSecretHeader,
  configureBot,
  createFinancingBotActions,
  jsonPost,
  simulationInput,
  simulationResult,
} from "./crm.whatsapp.botIntegration.testSupport.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";

describe("CRM WhatsApp Credere bot simulation actions", () => {
  it("requires idempotency and consent before creating", async () => {
    const createSimulation = vi.fn();
    const app = createTestApp({
      financingBotActions: createFinancingBotActions({ createSimulation }),
      resolveBotEntitlements: async () => ["crm", "simulations"] as const,
    });
    await configureBot(app);

    const missingKey = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost(
        {
          action: "credere_create_simulation",
          payload: { simulation: simulationInput() },
        },
        botActionSecretHeader,
      ),
    );
    const missingConsent = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost(
        {
          action: "credere_create_simulation",
          idempotencyKey: "simulation-key-1",
          payload: {
            simulation: {
              ...simulationInput(),
              consent: { creditSimulation: false, personalData: true },
            },
          },
        },
        botActionSecretHeader,
      ),
    );

    expect(missingKey.status).toBe(400);
    expect(missingConsent.status).toBe(400);
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it("creates idempotently and returns only safe status fields", async () => {
    const createSimulation: CrmFinancingBotActions["createSimulation"] = vi.fn(
      async (
        context: ServiceContext,
        input: CrmFinancingCreateSimulationInput,
      ) => {
        expect(context.permissions).toEqual(["financing.simulation.create"]);
        expect(input.idempotencyKey).toBe("simulation-key-2");
        expect(input.payload.vehicle.priceCents).toBe(5_000_000);
        expect(input.payload).not.toHaveProperty("sellerCpf");
        expect(input.payload.vehicle).not.toHaveProperty(
          "credereVehicleModelId",
        );
        return {
          ...simulationResult(),
          cpfCnpj: "123.456.789-09",
          email: "cliente@example.test",
          providerPayload: { siblingStores: ["other-store"] },
        };
      },
    );
    const app = createTestApp({
      financingBotActions: createFinancingBotActions({ createSimulation }),
      resolveBotEntitlements: async () => ["crm", "simulations"] as const,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost(
        {
          action: "credere_create_simulation",
          idempotencyKey: "simulation-key-2",
          payload: { simulation: simulationInput() },
        },
        botActionSecretHeader,
      ),
    );

    expect(response.status, await response.clone().text()).toBe(200);
    const body = (await response.json()) as {
      action: "credere_create_simulation";
      result: {
        status: string;
        uuid: string;
      };
      success: boolean;
    };
    expect(body).toMatchObject({
      action: "credere_create_simulation",
      result: { status: "pending", uuid: "credere-simulation-1" },
      success: true,
    });
    expect(JSON.stringify(body)).not.toContain("123.456.789-09");
    expect(JSON.stringify(body)).not.toContain("cliente@example.test");
    expect(JSON.stringify(body)).not.toContain("providerPayload");
    expect(JSON.stringify(body)).not.toContain("other-store");
  });

  it("gets without refreshing unless explicitly requested", async () => {
    const getSimulation: CrmFinancingBotActions["getSimulation"] = vi.fn(
      async (
        _context: ServiceContext,
        input: CrmFinancingGetSimulationInput,
      ) => {
        expect(input.uuid).toBe("credere-simulation-1");
        return simulationResult();
      },
    );
    const app = createTestApp({
      financingBotActions: createFinancingBotActions({ getSimulation }),
      resolveBotEntitlements: async () => ["crm", "simulations"] as const,
    });
    await configureBot(app);

    const first = await getSimulationAction(app, {
      uuid: "credere-simulation-1",
    });
    const refreshed = await getSimulationAction(app, {
      refresh: true,
      uuid: "credere-simulation-1",
    });

    expect(first.status).toBe(200);
    expect(refreshed.status).toBe(200);
    expect(getSimulation).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ refresh: false }),
    );
    expect(getSimulation).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ refresh: true }),
    );
  });
});

function getSimulationAction(
  app: ReturnType<typeof createTestApp>,
  payload: Record<string, unknown>,
) {
  return app.request(
    "/api/v1/crm/whatsapp/integrations/bot/actions",
    jsonPost(
      { action: "credere_get_simulation", payload },
      botActionSecretHeader,
    ),
  );
}
