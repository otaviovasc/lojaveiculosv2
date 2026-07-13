// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkspaceKPIStrip } from "./WorkspaceKPIStrip";

afterEach(cleanup);

describe("WorkspaceKPIStrip", () => {
  it("keeps financing and insurance informational until the sale workflow", () => {
    render(
      <WorkspaceKPIStrip
        acquisitionPrice="R$ 100.000,00"
        margin="20%"
        renaveStatus="Publicado"
        salePrice="R$ 120.000,00"
        stockTime="10 dias"
      />,
    );

    expect(screen.getByText("Financiamento na venda")).toBeVisible();
    expect(screen.getByText("Seguro na venda")).toBeVisible();
    expect(screen.queryByRole("button", { name: /financiamento/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /seguro/i })).toBeNull();
  });
});
