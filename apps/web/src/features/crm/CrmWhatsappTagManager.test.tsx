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
    expect(screen.queryByLabelText("Nome")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nova etiqueta" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Nova etiqueta");

    await user.type(screen.getByLabelText("Nome"), "Cliente quente");
    await user.type(screen.getByLabelText("Emoji"), "🔥");
    await user.click(screen.getByRole("button", { name: "Criar etiqueta" }));

    expect(callbacks.onCreate).toHaveBeenCalledWith({
      emoji: "🔥",
      name: "Cliente quente",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Editar etiqueta Retorno" }),
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Editar Retorno");
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Retorno ativo");
    await user.click(screen.getByRole("button", { name: "Atualizar" }));

    expect(callbacks.onUpdate).toHaveBeenCalledWith("tag_return", {
      color: "var(--color-muted)",
      emoji: null,
      name: "Retorno ativo",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels the editor and starts the next draft empty", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole("button", { name: "Nova etiqueta" }));
    await user.type(screen.getByLabelText("Nome"), "Rascunho");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nova etiqueta" }));
    expect(screen.getByLabelText("Nome")).toHaveValue("");
  });

  it("keeps a rejected draft open with actionable feedback", async () => {
    const user = userEvent.setup();
    const callbacks = renderManager();
    callbacks.onCreate.mockResolvedValueOnce(false);

    await user.click(screen.getByRole("button", { name: "Nova etiqueta" }));
    await user.type(screen.getByLabelText("Nome"), "Importante");
    await user.click(screen.getByRole("button", { name: "Criar etiqueta" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(
      screen.getByText("Nao foi possivel salvar a etiqueta."),
    ).toBeVisible();
    expect(screen.getByLabelText("Nome")).toHaveValue("Importante");
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

  it("uses the shared named modal layer outside the embedded page", async () => {
    const user = userEvent.setup();
    const callbacks = renderManager(createTags(), { embedded: false });

    expect(
      screen.getByRole("dialog", { name: "Etiquetas WhatsApp" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(callbacks.onClose).toHaveBeenCalledOnce();
  });

  it("keeps the list visible but disables mutations without permission", () => {
    renderManager(createTags(), { disabled: true });

    expect(screen.getByText("Quente")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Nova etiqueta" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Editar etiqueta Quente" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Seu usuario pode visualizar, mas nao pode alterar etiquetas.",
      ),
    ).toBeVisible();
  });
});

function renderManager(
  tags: CrmWhatsappTag[] = createTags(),
  {
    disabled = false,
    embedded = true,
  }: { disabled?: boolean; embedded?: boolean } = {},
) {
  const callbacks = {
    onClose: vi.fn(),
    onCreate: vi.fn(async () => true),
    onDelete: vi.fn(async () => true),
    onReorder: vi.fn(async () => true),
    onUpdate: vi.fn(async () => true),
  };
  render(
    <CrmWhatsappTagManager
      disabled={disabled}
      embedded={embedded}
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
