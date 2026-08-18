// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);
import { DocumentCreateTemplateModal } from "./DocumentCreateTemplateModal";
import type { DocumentTemplate } from "./types";

const mockTemplates: DocumentTemplate[] = [
  {
    availableVariables: ["{{buyer.name}}"],
    blocks: [
      { id: "1", text: "CONTRATO DE COMPRA E VENDA", type: "heading" },
      { body: "Cláusula primeira de teste", id: "2", type: "clause" },
    ],
    category: "Vendas",
    clauses: ["Cláusula primeira de teste"],
    context: "sale_contract",
    defaultBlocks: [],
    defaultClauses: [],
    defaultTitle: "Contrato Padrão",
    description: "Modelo base",
    isCustomized: false,
    kind: "sale_contract",
    mode: "editable",
    source: "system",
    templateKey: "sale_contract",
    title: "Contrato de Compra e Venda",
    updatedAt: null,
  },
];

describe("DocumentCreateTemplateModal", () => {
  it("renders when open and creates a custom template based on an existing template", () => {
    const handleClose = vi.fn();
    const handleCreate = vi.fn();

    render(
      <DocumentCreateTemplateModal
        isOpen={true}
        onClose={handleClose}
        onCreate={handleCreate}
        templates={mockTemplates}
      />,
    );

    expect(screen.getByText("Novo modelo de documento")).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(
      "Ex.: Contrato de Venda com Entrada Parcelada",
    );
    fireEvent.change(titleInput, {
      target: { value: "Meu Contrato Personalizado" },
    });

    const createBtn = screen.getByRole("button", { name: "Criar modelo" });
    fireEvent.click(createBtn);

    expect(handleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        isCustomized: true,
        mode: "editable",
        source: "store",
        title: "Meu Contrato Personalizado",
      }),
    );
    expect(handleClose).toHaveBeenCalled();
  });

  it("shows error when title is empty", () => {
    const handleClose = vi.fn();
    const handleCreate = vi.fn();

    render(
      <DocumentCreateTemplateModal
        isOpen={true}
        onClose={handleClose}
        onCreate={handleCreate}
        templates={mockTemplates}
      />,
    );

    const createBtn = screen.getByRole("button", { name: "Criar modelo" });
    fireEvent.click(createBtn);

    expect(screen.getByText("Informe o nome do modelo.")).toBeInTheDocument();
    expect(handleCreate).not.toHaveBeenCalled();
  });
});
