// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhatsappBulkBar } from "./CrmWhatsappBulkBar";
import type { CrmWhatsappAgent } from "./crmWhatsappTypes";

describe("WhatsappBulkBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("stays hidden until at least one conversation is selected", () => {
    const { container } = renderBulkBar({ selectedCount: 0 });

    expect(container).toBeEmptyDOMElement();
  });

  it("runs bulk assignment, read state, close, and selection actions", async () => {
    const user = userEvent.setup();
    const callbacks = createCallbacks();
    renderBulkBar({ selectedCount: 2, ...callbacks });

    expect(screen.getByText("2 conversas")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Atribuir conversas selecionadas"),
      "2",
    );
    expect(callbacks.onAssign).toHaveBeenCalledWith("2");

    await user.click(
      screen.getByRole("button", {
        name: "Remover atribuicao das conversas selecionadas",
      }),
    );
    expect(callbacks.onAssign).toHaveBeenCalledWith(null);

    await user.click(
      screen.getByRole("button", {
        name: "Marcar conversas selecionadas como lidas",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Marcar conversas selecionadas como nao lidas",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Concluir conversas selecionadas" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Selecionar conversas visiveis" }),
    );
    await user.click(screen.getByRole("button", { name: "Limpar selecao" }));

    expect(callbacks.onMarkRead).toHaveBeenCalledTimes(1);
    expect(callbacks.onMarkUnread).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.onSelectAll).toHaveBeenCalledTimes(1);
    expect(callbacks.onClear).toHaveBeenCalledTimes(1);
  });

  it("keeps read-only operators away from assignment and close actions", () => {
    renderBulkBar({
      canAssign: false,
      canClose: false,
      canRead: true,
      selectedCount: 1,
    });

    expect(screen.getByText("1 conversa")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Atribuir conversas selecionadas"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Concluir conversas selecionadas",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Marcar conversas selecionadas como lidas",
      }),
    ).toBeInTheDocument();
  });
});

function renderBulkBar(
  overrides: Partial<Parameters<typeof WhatsappBulkBar>[0]> = {},
) {
  return render(
    <WhatsappBulkBar
      agents={createAgents()}
      canAssign={true}
      canClose={true}
      canRead={true}
      selectedCount={2}
      {...createCallbacks()}
      {...overrides}
    />,
  );
}

function createCallbacks() {
  return {
    onAssign: vi.fn(),
    onClear: vi.fn(),
    onClose: vi.fn(),
    onMarkRead: vi.fn(),
    onMarkUnread: vi.fn(),
    onSelectAll: vi.fn(),
  };
}

function createAgents(): CrmWhatsappAgent[] {
  return [
    createAgent(1, "Ana"),
    createAgent(2, "Bruno"),
    { ...createAgent(3, "Inativo"), isActive: false },
  ];
}

function createAgent(id: number, name: string): CrmWhatsappAgent {
  return {
    email: `${name.toLowerCase()}@loja.local`,
    id,
    isActive: true,
    name,
    role: "AGENT",
    seeUnassignedChats: true,
  };
}
