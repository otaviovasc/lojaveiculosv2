// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { moduleDefinitions } from "../../app/moduleDefinitions";
import { BillingUpgradePanel } from "./BillingUpgradePanel";

describe("BillingUpgradePanel", () => {
  afterEach(cleanup);

  it("routes a direct owner to the server-owned billing catalog", () => {
    const onOpenBilling = vi.fn();
    render(
      <BillingUpgradePanel
        featureKey="marketplace"
        managedByAgency={false}
        module={moduleDefinitions.marketplaces}
        onOpenBilling={onOpenBilling}
      />,
    );

    expect(screen.getByText("Disponível para contratar")).toBeVisible();
    expect(screen.getByText(/publicação e sincronização/i)).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver plano e pacotes" }),
    );
    expect(onOpenBilling).toHaveBeenCalledOnce();
  });

  it("keeps agency-managed billing authority explicit", () => {
    render(
      <BillingUpgradePanel
        featureKey="nfe"
        managedByAgency
        module={moduleDefinitions.fiscal}
        onOpenBilling={vi.fn()}
      />,
    );

    expect(screen.getByText("Gerenciado pela agência")).toBeVisible();
    expect(screen.getByText("Solicite à sua agência")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Ver plano e pacotes" }),
    ).not.toBeInTheDocument();
  });
});
