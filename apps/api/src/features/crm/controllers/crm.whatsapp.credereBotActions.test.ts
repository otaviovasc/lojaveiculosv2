import { describe, expect, it, vi } from "vitest";
import type { CrmFinancingBotActions } from "../../../domains/crm/ports/crmFinancingBotActions.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";
import {
  configureBot,
  jsonPost,
} from "./crm.whatsapp.botIntegration.testSupport.js";

const actionsPath = "/api/v1/crm/whatsapp/integrations/bot/actions";
const webhookSecret = "bot-webhook-secret-value-32-characters";

describe("CRM WhatsApp Credere bot actions", () => {
  it("returns readiness through scoped write-only bot authentication", async () => {
    const { audit, record } = createAuditSpy();
    const readiness = vi.fn(async () => ({
      provider: "credere" as const,
      ready: true,
      status: "ready" as const,
      usableBankCount: 2,
      usableBanks: [
        { code: "001", name: "Banco Um" },
        { code: "002", name: "Banco Dois" },
      ],
    }));
    const app = createCredereBotApp({ audit, readiness });
    await configureBot(app);

    const response = await app.request(
      actionsPath,
      jsonPost(
        { action: "credere_readiness" },
        { "X-Webhook-Secret": webhookSecret },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      action: "credere_readiness",
      result: { provider: "credere", ready: true, usableBankCount: 2 },
      success: true,
    });
    expect(readiness).toHaveBeenCalledOnce();
    expect(JSON.stringify(record.mock.calls)).not.toContain(webhookSecret);
  });

  it("creates a consented simulation with the explicit idempotency key", async () => {
    const createSimulation = vi.fn<CrmFinancingBotActions["createSimulation"]>(
      async () => ({
        conditions: [],
        inquiryId: "inq_bot_1",
        status: "processing",
      }),
    );
    const app = createCredereBotApp({ createSimulation });
    await configureBot(app);

    const response = await app.request(
      actionsPath,
      jsonPost(
        {
          action: "credere_create_simulation",
          idempotencyKey: "bot-credere-001",
          payload: { simulation: validSimulation() },
        },
        { "X-Webhook-Secret": webhookSecret },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      action: "credere_create_simulation",
      result: { inquiryId: "inq_bot_1", status: "processing" },
      success: true,
    });
    const [context, request] = createSimulation.mock.calls[0] ?? [];
    expect(context?.actor.kind).toBe("integration");
    expect(context?.storeId).toBe("store_1");
    expect(context?.tenantId).toBe("tenant_1");
    expect(request?.idempotencyKey).toBe("bot-credere-001");
    expect(request?.payload.consent).toEqual({
      creditSimulation: true,
      personalData: true,
    });
  });

  it("rejects invalid secrets and recursive scope overrides", async () => {
    const createSimulation = vi.fn();
    const app = createCredereBotApp({ createSimulation });
    await configureBot(app);

    const unauthorized = await app.request(
      actionsPath,
      jsonPost(
        { action: "credere_readiness" },
        { "X-Webhook-Secret": "wrong-secret" },
      ),
    );
    const simulation = validSimulation() as Record<string, unknown>;
    simulation.storeId = "store_2";
    const override = await app.request(
      actionsPath,
      jsonPost(
        {
          action: "credere_create_simulation",
          idempotencyKey: "bot-credere-override",
          payload: { simulation },
        },
        { "X-Webhook-Secret": webhookSecret },
      ),
    );

    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toMatchObject({
      code: "CRM_WHATSAPP_BOT_UNAUTHORIZED",
    });
    expect(override.status).toBe(400);
    expect(createSimulation).not.toHaveBeenCalled();
  });
});

function createCredereBotApp(overrides: {
  audit?: ReturnType<typeof createAuditSpy>["audit"];
  createSimulation?: CrmFinancingBotActions["createSimulation"];
  readiness?: CrmFinancingBotActions["readiness"];
}) {
  return createTestApp({
    ...(overrides.audit ? { audit: overrides.audit } : {}),
    entitlements: ["crm", "crm_zapi", "simulations"],
    financingBotActions: {
      createSimulation: overrides.createSimulation ?? vi.fn(async () => null),
      getSimulation: vi.fn(async () => null),
      readiness:
        overrides.readiness ??
        vi.fn(async () => ({
          provider: "credere" as const,
          ready: true,
          status: "ready" as const,
        })),
    },
  });
}

function validSimulation() {
  return {
    applicant: {
      document: "52998224725",
      name: "Ana Silva",
      phone: "11999990000",
    },
    consent: { creditSimulation: true, personalData: true },
    terms: { downPaymentCents: 2_000_000, installmentCounts: [24, 36] },
    vehicle: {
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      manufactureYear: 2023,
      modelYear: 2024,
      molicarCode: "001234",
      priceCents: 9_000_000,
    },
  };
}
