// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BillingProviderStatus } from "../../billing/types";
import type { AgencyTenantOverview } from "../apiClient";
import { createAgencyBillingOverview } from "./AgencyBillingPage.testFixtures";
import { AgencyBillingSummarySections } from "./AgencyBillingSummarySections";

afterEach(cleanup);

describe("AgencyBillingSummarySections", () => {
  it("does not mix a current trial with a new checkout or raw config keys", () => {
    const panelOverview = createAgencyBillingOverview("trialing");
    const providerStatus = {
      configured: false,
      missingConfiguration: ["ASAAS_API_KEY", "ASAAS_WEBHOOK_URL"],
      provider: "asaas",
      webhookConfigured: false,
    } satisfies BillingProviderStatus;

    const { container } = render(
      <AgencyBillingSummarySections
        checkoutState={{ kind: "idle" }}
        overview={{ allocations: [] } as unknown as AgencyTenantOverview}
        panelOverview={panelOverview}
        providerStatus={providerStatus}
        onCheckout={vi.fn()}
      />,
    );

    expect(screen.getByText("Período de teste ativo")).toBeVisible();
    expect(screen.getByText("Credencial de acesso do Asaas")).toBeVisible();
    expect(screen.queryByText("ASAAS_API_KEY")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ativar meu plano" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(
      container.querySelector(".agency-billing-state--info"),
    ).toBeInTheDocument();
  });

  it("shows checkout only when the canonical state allows it", () => {
    const panelOverview = createAgencyBillingOverview(null);
    render(
      <AgencyBillingSummarySections
        checkoutState={{ kind: "idle" }}
        overview={{ allocations: [] } as unknown as AgencyTenantOverview}
        panelOverview={panelOverview}
        providerStatus={{
          configured: true,
          missingConfiguration: [],
          provider: "asaas",
          webhookConfigured: true,
        }}
        onCheckout={vi.fn()}
      />,
    );

    expect(screen.getByText("Assinatura pronta para contratar")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ir para pagamento Asaas" }),
    ).toBeEnabled();
    expect(
      screen.getByText("Deslize para conferir todas as colunas da alocação."),
    ).toBeVisible();
  });
});
