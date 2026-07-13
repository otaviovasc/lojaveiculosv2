// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmLeadDetailsTabsNotas } from "./CrmLeadDetailsTabsNotas";
import { CrmLeadDetailsTabsReunioes } from "./CrmLeadDetailsTabsReunioes";
import { CrmLeadDetailsTabsTarefas } from "./CrmLeadDetailsTabsTarefas";
import type { ProductCrmLead } from "./productCrmTypes";

afterEach(cleanup);

describe("CRM lead activity dialogs", () => {
  it("creates a note through the shared named dialog", async () => {
    const user = userEvent.setup();
    const onCreateActivity = vi.fn(async () => undefined);
    render(
      <CrmLeadDetailsTabsNotas
        activities={[]}
        lead={lead}
        onCreateActivity={onCreateActivity}
      />,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Adicionar nota" })[0]!,
    );
    expect(
      screen.getByRole("dialog", { name: "Nova Nota" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Conteúdo"), "Cliente retornou");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(onCreateActivity).toHaveBeenCalledWith("lead_1", {
      activityType: "note",
      content: "Cliente retornou",
      direction: "internal",
    });
  });

  it("creates a meeting through shared fields and actions", async () => {
    const user = userEvent.setup();
    const onCreateActivity = vi.fn(async () => undefined);
    render(
      <CrmLeadDetailsTabsReunioes
        activities={[]}
        lead={lead}
        onCreateActivity={onCreateActivity}
      />,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Agendar reunião" })[0]!,
    );
    expect(
      screen.getByRole("dialog", { name: "Nova Reunião" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Assunto"), "Apresentar proposta");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(onCreateActivity).toHaveBeenCalledWith(
      "lead_1",
      expect.objectContaining({
        activityType: "call",
        content: "Apresentar proposta",
        direction: "internal",
      }),
    );
  });

  it("creates a task through shared fields and actions", async () => {
    const user = userEvent.setup();
    const onCreateActivity = vi.fn(async () => undefined);
    render(
      <CrmLeadDetailsTabsTarefas
        activities={[]}
        lead={lead}
        onCreateActivity={onCreateActivity}
      />,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Criar tarefa" })[0]!,
    );
    expect(
      screen.getByRole("dialog", { name: "Nova Tarefa" }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Título"), "Enviar documentos");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(onCreateActivity).toHaveBeenCalledWith(
      "lead_1",
      expect.objectContaining({
        activityType: "task",
        content: "Enviar documentos",
        direction: "internal",
      }),
    );
  });
});

const lead: ProductCrmLead = {
  assignedUserId: null,
  buyerEmail: null,
  buyerName: "Cliente",
  buyerPhone: null,
  createdAt: "2026-07-12T12:00:00.000Z",
  id: "lead_1",
  lastInteractionAt: null,
  listingId: null,
  metadata: {},
  pipelineId: null,
  pipelineStageId: null,
  source: "manual",
  status: "new",
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: "2026-07-12T12:00:00.000Z",
  vehicleTitle: null,
};
