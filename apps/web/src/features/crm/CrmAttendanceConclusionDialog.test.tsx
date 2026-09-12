// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CrmAttendanceConclusionDialog,
  type CrmConclusionInput,
} from "./CrmAttendanceConclusionDialog";
import type { CrmConversationCycle } from "./crmConversationTypes";

describe("CrmAttendanceConclusionDialog", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "command-1") });
    window.location.hash = "#/crm?surface=conversations";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("summarizes the opportunity and keeps the optional reminder collapsed", async () => {
    renderDialog();

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText("Ana Cliente")).toBeVisible();
    expect(screen.getByText("Carlos Vendedor")).toBeVisible();
    expect(screen.getByText("Negociação")).toBeVisible();
    expect(screen.getByText("WhatsApp")).toBeVisible();
    expect(screen.getByText("Corolla XEi")).toBeVisible();
    expect(screen.queryByLabelText("Quando lembrar")).not.toBeInTheDocument();
  });

  it("concludes as follow-up with an optional reminder and closes on success", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConclude = vi.fn<(input: CrmConclusionInput) => Promise<boolean>>(
      async () => true,
    );
    renderDialog({ onClose, onConclude });

    await user.click(
      await screen.findByRole("button", { name: /agendar lembrete/i }),
    );
    await user.click(screen.getByLabelText("Quando lembrar"));
    await user.click(
      screen.getByRole("option", {
        name: "Em 3 dias",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    );

    expect(onConclude).toHaveBeenCalledTimes(1);
    const input = onConclude.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      commandId: "command-1",
      outcome: "follow_up",
    });
    expect(input?.outcome === "follow_up" && input.reminder?.dueAt).toEqual(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("requires a reason and details when the lost reason is other", async () => {
    const user = userEvent.setup();
    const onConclude = vi.fn(async () => true);
    renderDialog({ onConclude });

    await user.click(await screen.findByRole("radio", { name: /perdido/i }));
    await user.click(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Selecione o motivo");

    await user.click(screen.getByLabelText("Motivo da perda"));
    await user.click(screen.getByRole("option", { name: "Outro" }));
    await user.click(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Descreva o outro motivo",
    );
    await user.type(
      screen.getByLabelText("Detalhes do motivo"),
      "Mudou de cidade",
    );
    await user.click(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    );

    expect(onConclude).toHaveBeenCalledWith({
      commandId: "command-1",
      note: "Mudou de cidade",
      outcome: "lost",
      reason: "other",
    });
  });

  it("reuses the command id when a conclusion is retried", async () => {
    const user = userEvent.setup();
    const onConclude = vi
      .fn<(input: CrmConclusionInput) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    renderDialog({ onConclude });

    const submit = await screen.findByRole("button", {
      name: "Concluir atendimento",
    });
    await user.click(submit);
    await user.click(submit);

    expect(onConclude).toHaveBeenCalledTimes(2);
    expect(onConclude.mock.calls[0]?.[0]).toMatchObject({
      commandId: "command-1",
    });
    expect(onConclude.mock.calls[1]?.[0]).toMatchObject({
      commandId: "command-1",
    });
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  it("navigates to the canonical sales context without concluding", async () => {
    const user = userEvent.setup();
    const onConclude = vi.fn(async () => true);
    renderDialog({ onConclude });

    await user.click(
      await screen.findByRole("button", { name: /iniciar venda/i }),
    );

    expect(onConclude).not.toHaveBeenCalled();
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    expect(window.location.hash.startsWith("#/sales?")).toBe(true);
    expect(Object.fromEntries(params)).toMatchObject({
      customerDisplayName: "Ana Cliente",
      customerPhone: "5511999999999",
      leadId: "lead-1",
      listingId: "listing-1",
      listingTitle: "Corolla XEi",
      sellerUserId: "7",
      unitId: "unit-1",
    });
  });
});

function renderDialog({
  onClose = vi.fn(),
  onConclude = vi.fn(async () => true),
}: {
  onClose?: () => void;
  onConclude?: (input: CrmConclusionInput) => Promise<boolean>;
} = {}) {
  return render(
    <CrmAttendanceConclusionDialog
      assignableMembers={[{ id: 7, name: "Carlos Vendedor" }]}
      onClose={onClose}
      onConclude={onConclude}
      cycle={cycle}
    />,
  );
}

const cycle: CrmConversationCycle = {
  assignedUserId: "7",
  customerDisplayName: "Ana Cliente",
  customerPhone: "5511999999999",
  channel: "whatsapp",
  id: "cycle-1",
  leadId: "lead-1",
  metadata: {
    listingId: "listing-1",
    pipelineStageName: "Negociação",
    unitId: "unit-1",
  },
  status: "ACTIVE",
  vehicle: { title: "Corolla XEi" },
};
