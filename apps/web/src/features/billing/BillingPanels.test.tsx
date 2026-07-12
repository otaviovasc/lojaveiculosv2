// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BillingEntitlementMatrix } from "./BillingPanels";
import type { BillingEntitlementMatrixRow } from "./types";

afterEach(cleanup);

describe("BillingEntitlementMatrix", () => {
  it("renders and opens automation when it is outside the current plan", async () => {
    const user = userEvent.setup();
    const automation = {
      endsAt: null,
      featureKey: "automation",
      includedInPlan: false,
      limitValue: null,
      source: "trial",
      startsAt: null,
      status: "active",
    } satisfies BillingEntitlementMatrixRow;

    render(
      <BillingEntitlementMatrix
        matrix={[automation]}
        onReasonChange={vi.fn()}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        reasons={{}}
        savingFeatureKey={null}
      />,
    );

    expect(screen.getByRole("heading", { name: "Operador IA" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Gerenciar" }));

    expect(
      screen.getByRole("dialog", { name: "Gerenciar Operador IA" }),
    ).toBeVisible();
    expect(screen.getByText("Add-on sem cobrança neste ciclo")).toBeVisible();
    expect(
      screen.getByText(
        "Prévias versionadas com revisão humana antes de qualquer execução assistida.",
      ),
    ).toBeVisible();
  });
});
