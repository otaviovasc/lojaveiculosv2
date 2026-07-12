import { describe, expect, it } from "vitest";
import type { BillingProviderStatus } from "../../billing/types";
import { createAgencyBillingOverview } from "./AgencyBillingPage.testFixtures";
import {
  agencyBillingConfigurationLabels,
  createAgencyBillingCanonicalState,
} from "./AgencyBillingPage.model";

describe("AgencyBillingPage model", () => {
  it("keeps an existing trial as the canonical state and blocks a second checkout", () => {
    const state = createAgencyBillingCanonicalState(
      createAgencyBillingOverview("trialing"),
      providerStatus(false),
    );

    expect(state).toMatchObject({
      canCheckout: false,
      kind: "current",
      metricLabel: "Em teste",
      title: "Período de teste ativo",
      tone: "info",
    });
    expect(state.integrationRequirements).toEqual([
      "Módulo de conexão com o Asaas",
      "Credencial de acesso do Asaas",
      "Chave de validação do webhook",
    ]);
  });

  it("uses payment attention before offering another checkout", () => {
    const state = createAgencyBillingCanonicalState(
      createAgencyBillingOverview("past_due"),
      providerStatus(true),
    );

    expect(state).toMatchObject({
      canCheckout: false,
      kind: "payment_attention",
      title: "Pagamento em atraso",
      tone: "danger",
    });
  });

  it("offers checkout only without a current subscription and with a ready provider", () => {
    const blocked = createAgencyBillingCanonicalState(
      createAgencyBillingOverview(null),
      providerStatus(false),
    );
    const ready = createAgencyBillingCanonicalState(
      createAgencyBillingOverview(null),
      providerStatus(true),
    );

    expect(blocked).toMatchObject({
      canCheckout: false,
      kind: "provider_attention",
      title: "Integração de cobrança pendente",
    });
    expect(ready).toMatchObject({
      canCheckout: true,
      kind: "ready_to_subscribe",
      title: "Assinatura pronta para contratar",
    });
  });

  it("turns provider configuration keys into human Portuguese", () => {
    const labels = agencyBillingConfigurationLabels([
      "ASAAS_API_URL",
      "PUBLIC_APP_URL",
      "ASAAS_WEBHOOK_URL",
      "UNKNOWN_INTERNAL_KEY",
    ]);

    expect(labels).toEqual([
      "Endereço da API do Asaas",
      "Endereço público do aplicativo",
      "Endereço do webhook de cobrança",
      "Configuração complementar da integração",
    ]);
    expect(labels.join(" ")).not.toContain("ASAAS_");
  });
});

function providerStatus(configured: boolean): BillingProviderStatus {
  return {
    configured,
    missingConfiguration: configured
      ? []
      : [
          "ASAAS_RUNTIME_IMPLEMENTATION",
          "ASAAS_API_KEY",
          "ASAAS_WEBHOOK_SECRET",
        ],
    provider: "asaas",
    webhookConfigured: configured,
  };
}
