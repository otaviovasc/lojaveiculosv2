// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BillingCrmPackage } from "./BillingCrmPackage";
import type { BillingAddon, BillingAddonContract } from "./types";

afterEach(cleanup);

describe("BillingCrmPackage", () => {
  it("explains the CRM package and schedules Z-API without mid-cycle billing", () => {
    const onRequestZapi = vi.fn();
    renderPackage({ onRequestZapi });

    expect(screen.getByRole("heading", { name: "CRM" })).toBeVisible();
    expect(
      screen.getByText("WhatsApp Oficial e Instagram incluídos"),
    ).toBeVisible();
    expect(screen.getByText(/R\$\s179,00/)).toBeVisible();
    expect(screen.getByText(/CRM fica em R\$\s279,00\/mês/)).toBeVisible();
    expect(
      screen.getByText("10.000 ações de integração por mês incluídas"),
    ).toBeVisible();
    expect(
      screen.getByText(/não adiciona cobrança automática por excedente/i),
    ).toBeVisible();
    expect(screen.getByText(/Não há cobrança no meio do ciclo/)).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Solicitar para o próximo vencimento",
      }),
    );
    expect(onRequestZapi).toHaveBeenCalledTimes(1);
  });

  it("uses the card itself for CRM selection and keeps the price in the footer", () => {
    const onToggleCrm = vi.fn();
    renderPackage({ isCrmSelected: false, onToggleCrm });

    const card = screen.getByRole("checkbox", {
      name: "Adicionar CRM à assinatura",
    });
    expect(card).toHaveTextContent(/R\$\s179,00/);
    expect(card).toHaveTextContent("/mês");
    expect(
      screen.queryByRole("button", { name: "Adicionar CRM" }),
    ).not.toBeInTheDocument();

    fireEvent.click(card);
    expect(onToggleCrm).toHaveBeenCalledTimes(1);
  });

  it("shows the scheduled state and lets an authorized manager cancel", () => {
    const onCancelZapi = vi.fn();
    renderPackage({
      contract: contract("scheduled"),
      onCancelZapi,
    });

    expect(
      screen.getByText("Programado para o próximo vencimento"),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar solicitação" }),
    );
    expect(onCancelZapi).toHaveBeenCalledTimes(1);
  });

  it("selects Z-API in the first checkout instead of scheduling a renewal", () => {
    const onToggleZapi = vi.fn();
    const onRequestZapi = vi.fn();
    renderPackage({
      onRequestZapi,
      onToggleZapi,
      subscriptionStatus: "trialing",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Adicionar Z-API à primeira cobrança",
      }),
    );
    expect(onToggleZapi).toHaveBeenCalledTimes(1);
    expect(onRequestZapi).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", {
        name: "Solicitar para o próximo vencimento",
      }),
    ).not.toBeInTheDocument();
  });

  it("opens support with the safe code after payment", () => {
    renderPackage({ contract: contract("paid_awaiting_setup") });

    expect(
      screen.getByText("Contratado — aguardando configuração"),
    ).toBeVisible();
    const support = screen.getByRole("link", {
      name: "Falar com o suporte no WhatsApp",
    });
    expect(support).toHaveAttribute(
      "href",
      expect.stringContaining("5511940231407"),
    );
    expect(decodeURIComponent(support.getAttribute("href") ?? "")).toContain(
      "ZAPI-ABC123",
    );
  });
});

function renderPackage(
  overrides: Partial<React.ComponentProps<typeof BillingCrmPackage>> = {},
) {
  return render(
    <BillingCrmPackage
      canManage
      contract={null}
      crmAddon={addon("crm_core", "crm", 17_900)}
      isBusy={false}
      isCrmSelected
      isZapiSelected={false}
      onCancelZapi={vi.fn()}
      onRequestZapi={vi.fn()}
      onToggleCrm={vi.fn()}
      onToggleZapi={vi.fn()}
      subscriptionStatus="active"
      zapiAddon={addon("crm_zapi", "crm_zapi", 10_000)}
      {...overrides}
    />,
  );
}

function addon(
  code: string,
  featureKey: BillingAddon["featureKey"],
  monthlyPriceCents: number,
): BillingAddon {
  return {
    catalogVersion: "2026-08-v1",
    code,
    featureKey,
    id: `addon_${code}`,
    includedInTrial: false,
    limits:
      code === "crm_core"
        ? {
            composioToolExecutionsPerBillingMonth: 10_000,
            enforcement: "soft",
          }
        : {
            composioToolExecutionsPerBillingMonth: null,
            enforcement: null,
          },
    monthlyPriceCents,
    name: code,
    status: "active",
  };
}

function contract(
  status: BillingAddonContract["status"],
): BillingAddonContract {
  return {
    addonCode: "crm_zapi",
    cancellationScheduledFor: null,
    id: "contract_1",
    monthlyPriceCents: 10_000,
    paidAt:
      status === "paid_awaiting_setup" ? "2026-09-01T12:00:00.000Z" : null,
    scheduledFor: "2026-09-01T12:00:00.000Z",
    setupCompletedAt: null,
    status,
    storeId: "store_1",
    supportCode: "ZAPI-ABC123",
  };
}
