// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmQuickAddLeadModal } from "./CrmQuickAddLeadModal";
import type { PipelineStage } from "./crmPipelineStorage";

describe("CrmQuickAddLeadModal", () => {
  afterEach(cleanup);

  it("shows localized validation and submit failures without closing", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onCreateLead = vi.fn().mockRejectedValue(undefined);
    render(
      <CrmQuickAddLeadModal
        onClose={onClose}
        onCreateLead={onCreateLead}
        stageId="new"
        stages={[stage]}
        vehicleOptions={[]}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Novo negócio" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Criar negócio" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe o nome do contato.",
    );

    await user.type(screen.getByLabelText("Nome do contato"), "Ana Souza");
    const phone = screen.getByLabelText("Telefone");
    await user.type(phone, "11999998888");
    expect(phone).toHaveValue("(11) 99999-8888");
    await user.click(screen.getByRole("button", { name: "Criar negócio" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível criar o negócio.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

const stage: PipelineStage = {
  color: "var(--color-accent)",
  id: "new",
  isSystem: true,
  leadStatus: "new",
  name: "Novo",
  slaDays: 1,
  status: "open",
};
