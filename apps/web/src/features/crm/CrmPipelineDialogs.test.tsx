// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmEditStageModal } from "./CrmEditStageModal";
import { CrmQuickAddPipelineModal } from "./CrmQuickAddPipelineModal";
import { CrmQuickAddStageModal } from "./CrmQuickAddStageModal";
import type { PipelineStage } from "./crmPipelineStorage";

afterEach(cleanup);

describe("CRM pipeline dialogs", () => {
  it("creates a stage with Enter through the shared named dialog", async () => {
    const user = userEvent.setup();
    const onAddStage = vi.fn();
    const onClose = vi.fn();
    render(<CrmQuickAddStageModal onAddStage={onAddStage} onClose={onClose} />);

    expect(
      screen.getByRole("dialog", { name: "Criar Nova Fase" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nome da Fase *"), "Proposta{Enter}");

    expect(onAddStage).toHaveBeenCalledWith("Proposta", presetBlue, 2);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("rejects a stage SLA outside the API range", async () => {
    const user = userEvent.setup();
    const onAddStage = vi.fn();
    render(<CrmQuickAddStageModal onAddStage={onAddStage} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText("Nome da Fase *"), "Proposta");
    const sla = screen.getByLabelText("SLA de Atendimento (Dias)");
    await user.clear(sla);
    await user.type(sla, "366");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe entre 1 e 365 dias.",
    );
    expect(
      screen.getByRole("button", { name: "Adicionar Fase" }),
    ).toBeDisabled();
    expect(onAddStage).not.toHaveBeenCalled();
  });

  it("edits a stage through shared fields and actions", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(
      <CrmEditStageModal stage={stage} onClose={onClose} onSave={onSave} />,
    );

    expect(
      screen.getByRole("dialog", { name: "Editar Etapa" }),
    ).toBeInTheDocument();
    const name = screen.getByLabelText("Nome da Etapa *");
    await user.clear(name);
    await user.type(name, "Qualificado");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSave).toHaveBeenCalledWith("Qualificado", stage.color, 2);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("creates a pipeline with the selected preset", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreatePipeline = vi.fn();
    render(
      <CrmQuickAddPipelineModal
        onClose={onClose}
        onCreatePipeline={onCreatePipeline}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Novo Pipeline" }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Nome do Funil / Pipeline *"),
      "Vendas premium",
    );
    await user.click(screen.getByRole("button", { name: "Criar Pipeline" }));

    expect(onCreatePipeline).toHaveBeenCalledWith(
      "Vendas premium",
      expect.arrayContaining([
        expect.objectContaining({ name: "Novo lead", status: "open" }),
        expect.objectContaining({ name: "Ganho", status: "won" }),
        expect.objectContaining({ name: "Perdido", status: "lost" }),
      ]),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});

const presetBlue = ["#", "3b82f6"].join("");

const stage: PipelineStage = {
  color: presetBlue,
  id: "proposal",
  isSystem: false,
  leadStatus: "negotiating",
  name: "Proposta",
  slaDays: 2,
  status: "open",
};
