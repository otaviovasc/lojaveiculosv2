// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PublicApiReferencePanel } from "./PublicApiReferencePanel";
import { publicApiEndpoints } from "./publicApiRuntimeCatalog";

describe("PublicApiReferencePanel", () => {
  it("progressively reveals labeled, keyboard-focusable curl examples", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn(async () => undefined);
    const { container } = render(
      <PublicApiReferencePanel
        copiedId={null}
        deploymentBaseUrl="https://api.example.test"
        onCopy={onCopy}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Copiar URL do artefato Docs" }),
    ).toBeVisible();
    expect(
      screen.getByText("https://api.example.test/api/v1/external-api/docs"),
    ).toBeVisible();
    expect(screen.queryByText("Listar veículos")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rotas/ }));

    const codeRegions = Array.from(container.querySelectorAll("pre"));
    expect(codeRegions).toHaveLength(publicApiEndpoints.length);
    for (const region of codeRegions) {
      expect(region).toHaveAttribute("tabindex", "0");
      expect(region).toHaveAccessibleName(/Exemplo curl para/);
    }

    await user.click(screen.getByText("Listar veículos"));
    const vehicleDetails = screen
      .getByText("Listar veículos")
      .closest("details");
    expect(vehicleDetails).not.toBeNull();
    expect(
      within(vehicleDetails!).getByText(/Query: page, limit, offset/),
    ).toBeVisible();
    expect(
      within(vehicleDetails!).getByText(
        "data[] + pagination { page, limit, total, hasMore }",
      ),
    ).toBeVisible();
    expect(
      within(vehicleDetails!).getByText(/"nextOffset":null/),
    ).toBeVisible();
    expect(
      within(vehicleDetails!).getByText(/401 chave.*403 escopo/),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Exemplo curl para Listar veículos"),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Copiar curl de Listar veículos" }),
    );
    expect(onCopy).toHaveBeenCalledOnce();
  });
});
