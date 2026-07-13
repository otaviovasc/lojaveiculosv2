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
import { ActionDialog } from "./CrmWhatsappActionDialogFrame";

afterEach(cleanup);

describe("ActionDialog", () => {
  it("names and traps the modal, closes on Escape, and restores focus", async () => {
    const onClose = vi.fn();
    const trigger = <button type="button">Abrir ação</button>;
    const { rerender } = render(trigger);
    screen.getByRole("button", { name: "Abrir ação" }).focus();

    rerender(
      <>
        {trigger}
        <ActionDialog
          icon={<span aria-hidden="true">+</span>}
          onClose={onClose}
          onSubmit={vi.fn(async () => undefined)}
          title="Nova conversa"
        >
          <input aria-label="Mensagem" />
        </ActionDialog>
      </>,
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Nova conversa",
    });
    expect(screen.getAllByRole("button", { name: "Fechar" })).toHaveLength(1);
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(trigger);
    expect(screen.getByRole("button", { name: "Abrir ação" })).toHaveFocus();
  });
});
