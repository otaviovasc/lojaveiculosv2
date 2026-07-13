// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappQuickMessageManager } from "./CrmWhatsappQuickMessageManager";
import type { CrmWhatsappQuickMessage } from "./crmWhatsappTypes";

describe("CrmWhatsappQuickMessageManager", () => {
  afterEach(() => cleanup());

  it("edits an existing text template", async () => {
    const user = userEvent.setup();
    const message = createQuickMessage({
      content: "Texto antigo",
      shortcut: "/old",
      title: "Oferta",
    });
    const callbacks = renderManager([message]);

    expect(
      screen.getByRole("dialog", { name: "Mensagens rapidas" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar Oferta" }));
    await user.clear(screen.getByLabelText("Nome"));
    await user.type(screen.getByLabelText("Nome"), "Oferta editada");
    await user.clear(screen.getByLabelText("Texto"));
    await user.type(screen.getByLabelText("Texto"), "Texto atualizado");
    await user.click(screen.getByRole("button", { name: "Atualizar modelo" }));

    expect(callbacks.onUpdate).toHaveBeenCalledWith(message, {
      content: "Texto atualizado",
      kind: "TEXT",
      shortcut: "/old",
      title: "Oferta editada",
    });
    expect(callbacks.onCreate).not.toHaveBeenCalled();
  });

  it("keeps existing media when editing an image template without a new file", async () => {
    const user = userEvent.setup();
    const message = createQuickMessage({
      content: "Legenda antiga",
      kind: "IMAGE",
      mediaUrl: "https://cdn.local/template.jpg",
      shortcut: "/foto",
      title: "Foto estoque",
    });
    const callbacks = renderManager([message]);

    await user.click(
      screen.getByRole("button", { name: "Editar Foto estoque" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.local/template.jpg",
    );
    await user.clear(screen.getByLabelText("Legenda"));
    await user.type(screen.getByLabelText("Legenda"), "Legenda nova");
    await user.click(screen.getByRole("button", { name: "Atualizar modelo" }));

    expect(callbacks.onUpdate).toHaveBeenCalledWith(message, {
      content: "Legenda nova",
      kind: "IMAGE",
      shortcut: "/foto",
      title: "Foto estoque",
    });
  });
});

function renderManager(messages: CrmWhatsappQuickMessage[]) {
  const callbacks = {
    onClose: vi.fn(),
    onCreate: vi.fn(async () => true),
    onDelete: vi.fn(async () => true),
    onUpdate: vi.fn(async () => true),
  };
  render(
    <CrmWhatsappQuickMessageManager
      disabled={false}
      messages={messages}
      {...callbacks}
    />,
  );
  return callbacks;
}

function createQuickMessage(
  input: Partial<CrmWhatsappQuickMessage> = {},
): CrmWhatsappQuickMessage {
  return {
    content: input.content ?? "Mensagem",
    id: input.id ?? "quick_1",
    isSystem: input.isSystem ?? false,
    kind: input.kind ?? "TEXT",
    mediaUrl: input.mediaUrl ?? null,
    shortcut: input.shortcut ?? "/msg",
    title: input.title ?? "Mensagem",
  };
}
