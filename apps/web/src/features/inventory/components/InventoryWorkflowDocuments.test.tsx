// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InventoryWorkflowDocumentHandoff } from "./InventoryWorkflowDocuments";

afterEach(cleanup);

describe("InventoryWorkflowDocumentHandoff", () => {
  it("sends completed sales to the stored official artifacts", () => {
    render(<InventoryWorkflowDocumentHandoff status="sold" />);

    expect(screen.getByText("Documentos da venda")).toBeVisible();
    expect(
      screen.getByText(/mesmo arquivo oficial registrado pelo fluxo/i),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Abrir documentos oficiais" }),
    ).toHaveAttribute("href", "#/documents");
    expect(
      screen.queryByRole("button", { name: /imprimir|salvar pdf/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show an artifact handoff before the operation exists", () => {
    render(<InventoryWorkflowDocumentHandoff status="available" />);

    expect(
      screen.queryByRole("region", {
        name: "Documentos oficiais da operação",
      }),
    ).not.toBeInTheDocument();
  });
});
