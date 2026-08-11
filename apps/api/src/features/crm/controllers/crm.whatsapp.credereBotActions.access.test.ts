import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmFinancingBotActions } from "../../../domains/crm/ports/crmFinancingBotActions.js";
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";
import {
  botActionSecretHeader,
  configureBot,
  createFinancingBotActions,
  jsonPost,
  simulationInput,
} from "./crm.whatsapp.botIntegration.testSupport.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp Credere bot action access", () => {
  it("executes readiness from the authenticated bot store scope", async () => {
    const readiness: CrmFinancingBotActions["readiness"] = vi.fn(
      async (context: ServiceContext) => {
        expect(context.storeId).toBe(storeId);
        expect(context.tenantId).toBe(tenantId);
        expect(context.permissions).toEqual(["financing.simulation.read"]);
        expect(context).toMatchObject({ entitlements: ["crm", "simulations"] });
        return {
          provider: "credere",
          ready: true,
          status: "ready",
          usableBankCount: 2,
        } as const;
      },
    );
    const resolveBotEntitlements = vi.fn(
      async () => ["crm", "simulations"] as const,
    );
    const app = createTestApp({
      financingBotActions: createFinancingBotActions({ readiness }),
      resolveBotEntitlements,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost({ action: "credere_readiness" }, botActionSecretHeader),
    );

    expect(response.status, await response.clone().text()).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: "credere_readiness",
      result: {
        provider: "credere",
        ready: true,
        status: "ready",
        usableBankCount: 2,
      },
      success: true,
    });
    expect(resolveBotEntitlements).toHaveBeenCalledWith(
      expect.objectContaining({ storeId, tenantId }),
    );
    expect(readiness).toHaveBeenCalledTimes(1);
  });

  it("fails closed without the simulations entitlement", async () => {
    const readiness = vi.fn();
    const app = createTestApp({
      financingBotActions: createFinancingBotActions({ readiness }),
      resolveBotEntitlements: async () => ["crm"] as const,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost({ action: "credere_readiness" }, botActionSecretHeader),
    );

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing entitlement: simulations",
    });
    expect(readiness).not.toHaveBeenCalled();
  });

  it("rejects tenant and store scope supplied by the bot request", async () => {
    const app = createTestApp({
      financingBotActions: createFinancingBotActions(),
      resolveBotEntitlements: async () => ["crm", "simulations"] as const,
    });
    await configureBot(app);

    const responses = await Promise.all([
      app.request(
        "/api/v1/crm/whatsapp/integrations/bot/actions",
        jsonPost(
          { action: "credere_readiness", storeId: "other-store" },
          botActionSecretHeader,
        ),
      ),
      app.request(
        "/api/v1/crm/whatsapp/integrations/bot/actions",
        jsonPost(
          {
            action: "credere_readiness",
            payload: { nested: { tenantId: "other" } },
          },
          botActionSecretHeader,
        ),
      ),
      app.request(
        "/api/v1/crm/whatsapp/integrations/bot/actions",
        jsonPost(
          { action: "credere_readiness" },
          {
            "Store-Id": "other-provider-store",
            "X-Webhook-Secret": "bot-webhook-secret-value-32-characters",
          },
        ),
      ),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(400);
      await expectApiError(response, {
        code: "CRM_WHATSAPP_VALIDATION_ERROR",
        message:
          response === responses[2]
            ? "Store-Id header is not accepted for bot actions."
            : "Request is invalid.",
      });
    }
  });

  it("recursively rejects provider fields in create payloads", async () => {
    const createSimulation = vi.fn();
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
          idempotencyKey: "simulation-forbidden-fields",
          payload: {
            simulation: {
              ...simulationInput(),
              sellerCpf: "987.654.321-00",
              vehicle: {
                ...simulationInput().vehicle,
                credereVehicleModelId: "credere-model-1",
              },
            },
          },
        },
        botActionSecretHeader,
      ),
    );

    expect(response.status).toBe(400);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_VALIDATION_ERROR",
      message: "Request is invalid.",
    });
    expect(createSimulation).not.toHaveBeenCalled();
  });
});
