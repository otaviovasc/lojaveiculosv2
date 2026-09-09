// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CrmLeadCsvImportDialog,
  type CrmLeadCsvImportDialogProps,
} from "./CrmLeadCsvImportDialog";
import type { PipelineStage } from "./crmPipelineStorage";

describe("CrmLeadCsvImportDialog", () => {
  afterEach(cleanup);

  const stages: PipelineStage[] = [
    {
      id: "stage-1",
      name: "Novos Leads",
      color: "var(--color-primary)",
      isSystem: true,
      leadStatus: "new",
      slaDays: 1,
      status: "open",
    },
    {
      id: "stage-2",
      name: "Atendimento",
      color: "var(--color-line-strong)",
      isSystem: false,
      leadStatus: "contacted",
      slaDays: 2,
      status: "open",
    },
  ];

  it("does not render when isOpen is false", () => {
    render(
      <CrmLeadCsvImportDialog
        isOpen={false}
        onClose={vi.fn()}
        onImport={vi.fn()}
        stages={stages}
      />,
    );
    expect(
      screen.queryByText("Importar Leads via CSV"),
    ).not.toBeInTheDocument();
  });

  it("renders properly when isOpen is true", () => {
    render(
      <CrmLeadCsvImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onImport={vi.fn()}
        stages={stages}
      />,
    );
    expect(screen.getByText("Importar Leads via CSV")).toBeInTheDocument();
    expect(screen.getByText("Etapa de destino")).toBeInTheDocument();
  });

  it("rejects files larger than 2MB", async () => {
    render(
      <CrmLeadCsvImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onImport={vi.fn()}
        stages={stages}
      />,
    );

    const file = new File(["a".repeat(2_000_001)], "huge.csv", {
      type: "text/csv",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("O CSV deve ter até 2 MB.")).toBeInTheDocument();
    });
  });

  it("parses CSV, shows preview with valid and invalid rows, and submits only valid rows", async () => {
    const onImport = vi
      .fn<CrmLeadCsvImportDialogProps["onImport"]>()
      .mockResolvedValue({
        created: 1,
        skipped: 0,
        errors: [],
      });
    const onSuccess = vi.fn();

    render(
      <CrmLeadCsvImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onImport={onImport}
        onSuccess={onSuccess}
        stages={stages}
      />,
    );

    const csvContent = [
      "Nome,Telefone,Email",
      "Carlos Silva,11999998888,carlos@teste.com", // valid line 2
      ",,invalido", // invalid line 3 (missing name)
    ].join("\n");

    const file = new File([csvContent], "leads.csv", { type: "text/csv" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("2 linhas analisadas")).toBeInTheDocument();
      expect(screen.getByText("1 válidas")).toBeInTheDocument();
      expect(screen.getByText("1 com erros")).toBeInTheDocument();
      expect(screen.getByText("Linha 3:")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", {
      name: "Importar contatos válidos",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledTimes(1);
      const firstCall = onImport.mock.calls[0];
      expect(firstCall).toBeDefined();
      if (!firstCall) throw new Error("Call not recorded");
      const callArg = firstCall[0];
      expect(callArg.pipelineStageId).toBe("stage-1");
      expect(callArg.rows).toHaveLength(1);
      expect(callArg.rows[0]).toEqual({
        buyerName: "Carlos Silva",
        buyerPhone: "11999998888",
        buyerEmail: "carlos@teste.com",
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Resultado da importação")).toBeInTheDocument();
    });
  });

  it("maps 1-based server error row index back to original CSV line", async () => {
    const onImport = vi
      .fn<CrmLeadCsvImportDialogProps["onImport"]>()
      .mockResolvedValue({
        created: 0,
        skipped: 1,
        errors: [
          {
            row: 1, // 1-based index for first valid row
            message: "Telefone duplicado",
          },
        ],
      });

    render(
      <CrmLeadCsvImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onImport={onImport}
        stages={stages}
      />,
    );

    const csvContent = [
      "Nome,Telefone",
      ",", // line 2 invalid
      "Maria Silva,11988887777", // line 3 valid (index 0 of validRows, row 1 from server)
    ].join("\n");

    const file = new File([csvContent], "leads.csv", { type: "text/csv" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("1 válidas")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", {
      name: "Importar contatos válidos",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Resultado da importação")).toBeInTheDocument();
      expect(screen.getByText("Linha 3:")).toBeInTheDocument();
      expect(screen.getByText("Telefone duplicado")).toBeInTheDocument();
    });
  });

  it("maps server error row 2 to CSV line 4 when middle row is invalid", async () => {
    const onImport = vi
      .fn<CrmLeadCsvImportDialogProps["onImport"]>()
      .mockResolvedValue({
        created: 1,
        skipped: 1,
        errors: [
          {
            row: 2, // 1-based index for second valid row
            message: "Email já cadastrado",
          },
        ],
      });

    render(
      <CrmLeadCsvImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onImport={onImport}
        stages={stages}
      />,
    );

    const csvContent = [
      "Nome,Telefone,Email", // line 1
      "Primeiro Valido,11911111111,p1@teste.com", // line 2 (valid row 1)
      ",,invalido", // line 3 (invalid)
      "Segundo Valido,11922222222,p2@teste.com", // line 4 (valid row 2)
    ].join("\n");

    const file = new File([csvContent], "leads.csv", { type: "text/csv" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("2 válidas")).toBeInTheDocument();
      expect(screen.getByText("1 com erros")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", {
      name: "Importar contatos válidos",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Resultado da importação")).toBeInTheDocument();
      expect(screen.getByText("Linha 4:")).toBeInTheDocument();
      expect(screen.getByText("Email já cadastrado")).toBeInTheDocument();
    });
  });

  it("reuses same idempotencyKey on retry if file and stage have not changed", async () => {
    let callCount = 0;
    const capturedKeys: string[] = [];

    const onImport = vi
      .fn<CrmLeadCsvImportDialogProps["onImport"]>()
      .mockImplementation((input) => {
        capturedKeys.push(input.idempotencyKey);
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Erro temporário de conexão"));
        }
        return Promise.resolve({ created: 1, skipped: 0, errors: [] });
      });

    render(
      <CrmLeadCsvImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onImport={onImport}
        stages={stages}
      />,
    );

    const csvContent = "Nome,Telefone\nJoao,11911112222";
    const file = new File([csvContent], "leads.csv", { type: "text/csv" });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("1 válidas")).toBeInTheDocument();
    });

    // 1st attempt fails
    const submitButton = screen.getByRole("button", {
      name: "Importar contatos válidos",
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Erro temporário de conexão"),
      ).toBeInTheDocument();
    });

    // Retry button appears with label "Tentar novamente"
    const retryButton = screen.getByRole("button", {
      name: "Tentar novamente",
    });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(onImport).toHaveBeenCalledTimes(2);
      expect(capturedKeys[0]).toBe(capturedKeys[1]); // Preserves same idempotencyKey
    });
  });
});
