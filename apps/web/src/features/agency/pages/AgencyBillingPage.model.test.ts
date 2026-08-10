import { describe, expect, it, vi } from "vitest";
import type { BillingProviderStatus } from "../../billing/types";
import { createAgencyBillingOverview } from "./AgencyBillingPage.testFixtures";
import {
  agencyBillingConfigurationLabels,
  createAgencyBillingCanonicalState,
  startAgencyStoreCheckout,
} from "./AgencyBillingPage.model";

describe("AgencyBillingPage model", () => {
  it("blocks first checkout during a trial until billing is ready", () => {
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
      "Segurança da confirmação automática",
    ]);
  });

  it("allows the agency to complete the first checkout during a trial", () => {
    const state = createAgencyBillingCanonicalState(
      createAgencyBillingOverview("trialing"),
      providerStatus(true),
    );

    expect(state).toMatchObject({
      canCheckout: true,
      kind: "current",
      title: "Período de teste ativo",
    });
    expect(state.description).toContain("conclua a primeira assinatura");
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
      "Endereço de confirmação automática",
      "Configuração complementar da integração",
    ]);
    expect(labels.join(" ")).not.toContain("ASAAS_");
  });

  it("saves CRM and Z-API for the store before creating the agency checkout", async () => {
    const calls: string[] = [];
    const updateStoreSelection = vi.fn(async () => {
      calls.push("selection");
      return createAgencyBillingOverview("trialing");
    });
    const createCheckout = vi.fn(async () => {
      calls.push("checkout");
      return {
        checkoutUrl: "https://asaas.test/checkout",
        expiresAt: null,
        externalReference: "agency:tenant_1",
        provider: "asaas" as const,
        providerCheckoutId: "checkout_1",
        subscriptionId: "subscription_1",
      };
    });
    const api = {
      createCheckout,
      updateStoreSelection,
    };

    await startAgencyStoreCheckout({
      addonIds: ["addon_crm_core", "addon_crm_zapi"],
      api,
      input: { billingTypes: ["CREDIT_CARD"] },
      planId: "plan_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(updateStoreSelection).toHaveBeenCalledWith("tenant_1", "store_1", {
      addonIds: ["addon_crm_core", "addon_crm_zapi"],
      planId: "plan_1",
    });
    expect(createCheckout).toHaveBeenCalledWith("tenant_1", {
      billingTypes: ["CREDIT_CARD"],
    });
    expect(calls).toEqual(["selection", "checkout"]);
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
