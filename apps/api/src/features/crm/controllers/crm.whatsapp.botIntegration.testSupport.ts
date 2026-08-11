import { expect, vi } from "vitest";
import type { CrmFinancingBotActions } from "../../../domains/crm/ports/crmFinancingBotActions.js";
import type { FinancingSimulation } from "../../../domains/financing/ports/financingProviderGateway.js";
import type { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

export const botActionSecretHeader = {
  "X-Webhook-Secret": "bot-webhook-secret-value-32-characters",
} as const;

export async function configureBot(app: ReturnType<typeof createTestApp>) {
  const response = await app.request(
    "/api/v1/crm/whatsapp/integrations/bot",
    jsonPost(
      {
        enabled: true,
        webhookSecret: "bot-webhook-secret-value-32-characters",
        webhookUrl: "https://bot.example.test/webhook",
      },
      undefined,
      "PATCH",
    ),
  );
  expect(response.status).toBe(200);
}

export function jsonPost(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method,
  };
}

export function createFinancingBotActions(
  overrides: Partial<CrmFinancingBotActions> = {},
): CrmFinancingBotActions {
  return {
    createSimulation: vi.fn(async () => simulationResult()),
    getSimulation: vi.fn(async () => simulationResult()),
    readiness: vi.fn(
      async () =>
        ({
          provider: "credere",
          ready: true,
          status: "ready",
        }) as const,
    ),
    ...overrides,
  };
}

export function simulationInput() {
  return {
    applicant: {
      birthDate: "1990-01-01",
      document: "529.982.247-25",
      email: "buyer@test.local",
      monthlyIncomeCents: 600_000,
      name: "Buyer Test",
      phone: "(11) 98888-7777",
    },
    consent: {
      creditSimulation: true,
      personalData: true,
    },
    leadId: "lead_1",
    terms: {
      downPaymentCents: 1_000_000,
      financedAmountCents: 4_000_000,
      installmentCount: 48,
      requestedBankCodes: ["655"],
    },
    vehicle: {
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      manufactureYear: 2022,
      modelYear: 2023,
      molicarCode: "01906108-0",
      priceCents: 5_000_000,
      zeroKm: false,
    },
  };
}

export function simulationResult(): FinancingSimulation {
  return {
    conditions: [
      {
        available: false,
        bankCode: "655",
        bankName: "BV",
        downPaymentCents: 1_000_000,
        financedAmountCents: 4_000_000,
        firstInstallmentCents: null,
        id: "condition-1",
        installments: 48,
        preApprovalStatus: null,
        reason: "Aguardando processamento para 123.456.789-09",
        reasonIdentifier: null,
        status: "pending",
      },
    ],
    createdAt: "2026-07-27T10:00:00.000Z",
    providerRequestId: "credere-request-1",
    reason: "Cliente cliente@example.test em processamento",
    status: "pending",
    success: null,
    uuid: "credere-simulation-1",
  };
}
