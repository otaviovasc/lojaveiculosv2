// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappTagManager } from "./CrmWhatsappTagManager";
import type { CrmWhatsappTag } from "./crmWhatsappTypes";

describe("CrmWhatsappTagManager", () => {
  afterEach(() => cleanup());

  it("creates and edits WhatsApp labels without pipeline copy", async () => {
    const user = userEvent.setup();
    const callbacks = renderManager();

    expect(screen.queryByText(/pipeline|coluna/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Nome"), "Cliente quente");
    await user.type(screen.getByLabelText("Emoji"), "🔥");
    await user.click(screen.getByRole("button", { name: "Criar etiqueta" }));

    expect(callbacks.onCreate).toHaveBeenCalledWith({
      emoji: "🔥",
      name: "Cliente quente",
    });

    await user.click(
      screen.getByRole("button", { name: "Editar etiqueta Retorno" }),
    );
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Retorno ativo");
    await user.click(screen.getByRole("button", { name: "Atualizar" }));

    expect(callbacks.onUpdate).toHaveBeenCalledWith("tag_return", {
      color: "var(--color-muted)",
      emoji: null,
      name: "Retorno ativo",
    });
  });

  it("confirms delete before calling the delete handler", async () => {
    const user = userEvent.setup();
    const callbacks = renderManager();

    await user.click(
      screen.getByRole("button", { name: "Excluir etiqueta Quente" }),
    );

    expect(callbacks.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "Excluir etiqueta Quente",
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Excluir etiqueta Quente" }),
    );
    await user.click(screen.getByRole("button", { name: "Excluir" }));

    expect(callbacks.onDelete).toHaveBeenCalledWith("tag_hot");
  });

  it("reorders labels with stable accessible controls", async () => {
    const user = userEvent.setup();
    const callbacks = renderManager();

    expect(
      screen.getByLabelText("Etiqueta Quente, ordem 1 de 2"),
    ).toHaveTextContent("Ordem 1 de 2");
    expect(
      screen.getByRole("button", { name: "Subir etiqueta Quente" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Descer etiqueta Quente" }),
    );

    expect(callbacks.onReorder).toHaveBeenCalledWith({
      tagIds: ["tag_return", "tag_hot"],
    });
  });
});

function renderManager(tags: CrmWhatsappTag[] = createTags()) {
  const callbacks = {
    onClose: vi.fn(),
    onCreate: vi.fn(async () => true),
    onDelete: vi.fn(async () => true),
    onReorder: vi.fn(async () => true),
    onUpdate: vi.fn(async () => true),
  };
  render(
    <CrmWhatsappTagManager
      disabled={false}
      embedded
      tags={tags}
      {...callbacks}
    />,
  );
  return callbacks;
}

function createTags(): CrmWhatsappTag[] {
  return [
    {
      color: "var(--color-danger)",
      emoji: null,
      id: "tag_hot",
      name: "Quente",
      sortOrder: 1,
    },
    {
      color: "var(--color-muted)",
      emoji: null,
      id: "tag_return",
      name: "Retorno",
      sortOrder: 2,
    },
  ];
}
