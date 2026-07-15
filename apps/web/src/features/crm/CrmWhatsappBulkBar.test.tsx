// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhatsappBulkBar } from "./CrmWhatsappBulkBar";
import type { CrmWhatsappAssignableMember } from "./crmWhatsappTypes";

describe("WhatsappBulkBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("stays hidden until at least one conversation is selected", () => {
    const { container } = renderBulkBar({ selectedCount: 0 });

    expect(container).toBeEmptyDOMElement();
  });

  it("stages assignment, label, read state, and close before confirming", async () => {
    const user = userEvent.setup();
    const callbacks = createCallbacks();
    renderBulkBar({ selectedCount: 2, ...callbacks });

    expect(screen.getByText("2 conversas")).toBeInTheDocument();
    await user.click(
      screen.getByLabelText("Alterar atendente das conversas selecionadas"),
    );
    await user.click(screen.getByRole("option", { name: "Bruno" }));
    await user.click(
      screen.getByLabelText("Adicionar etiqueta às conversas selecionadas"),
    );
    await user.click(screen.getByRole("option", { name: "Quente" }));
    await user.click(screen.getByRole("button", { name: "Não lidas" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar em 2 conversas" }),
    );

    expect(callbacks.onApply).toHaveBeenCalledWith({
      assignedUserId: "2",
      close: true,
      readState: "unread",
      tag: { color: "var(--color-accent)", name: "Quente" },
    });

    await user.click(screen.getByRole("button", { name: "Selecionar página" }));
    expect(callbacks.onSelectAll).toHaveBeenCalledTimes(1);
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
      screen.queryByLabelText("Alterar atendente das conversas selecionadas"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Concluir" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Lidas",
      }),
    ).toBeInTheDocument();
  });
});

function renderBulkBar(
  overrides: Partial<Parameters<typeof WhatsappBulkBar>[0]> = {},
) {
  return render(
    <WhatsappBulkBar
      assignableMembers={createAssignableMembers()}
      availableTags={[
        { color: "var(--color-accent)", id: "tag-hot", name: "Quente" },
      ]}
      canAssign={true}
      canClose={true}
      canRead={true}
      canTag={true}
      selectedCount={2}
      {...createCallbacks()}
      {...overrides}
    />,
  );
}

function createCallbacks() {
  return {
    onApply: vi.fn(async () => true),
    onClear: vi.fn(),
    onSelectAll: vi.fn(),
  };
}

function createAssignableMembers(): CrmWhatsappAssignableMember[] {
  return [
    createAssignableMember(1, "Ana"),
    createAssignableMember(2, "Bruno"),
    { ...createAssignableMember(3, "Inativo"), isActive: false },
  ];
}

function createAssignableMember(
  id: number,
  name: string,
): CrmWhatsappAssignableMember {
  return {
    email: `${name.toLowerCase()}@loja.local`,
    id,
    isActive: true,
    name,
    role: "MEMBER",
    seeUnassignedChats: true,
  };
}
