// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureDialog } from "./FeatureOverlay";

afterEach(cleanup);

describe("FeatureDialog", () => {
  it("names and traps the dialog, closes on Escape, then restores focus", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Abrir automação</button>
        <FeatureDialog
          isOpen={false}
          onClose={onClose}
          title="Revisar proposta"
        >
          <button type="button">Primeira ação</button>
          <button type="button">Última ação</button>
        </FeatureDialog>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Abrir automação" });
    trigger.focus();

    rerender(
      <>
        <button type="button">Abrir automação</button>
        <FeatureDialog isOpen onClose={onClose} title="Revisar proposta">
          <button type="button">Primeira ação</button>
          <button type="button">Última ação</button>
        </FeatureDialog>
      </>,
    );

    const dialog = screen.getByRole("dialog", { name: "Revisar proposta" });
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement),
    );
    const last = within(dialog).getByRole("button", { name: "Última ação" });
    const first = within(dialog).getByRole("button", { name: "Fechar" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<button type="button">Abrir automação</button>);
    expect(
      screen.getByRole("button", { name: "Abrir automação" }),
    ).toHaveFocus();
  });

  it("keeps nested overlays locked and only closes the top layer", async () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    document.body.style.overflow = "clip";
    const { unmount } = render(
      <>
        <FeatureDialog isOpen onClose={closeFirst} title="Primeiro">
          Conteudo
        </FeatureDialog>
        <FeatureDialog isOpen onClose={closeSecond} title="Segundo">
          Conteudo
        </FeatureDialog>
      </>,
    );

    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closeSecond).toHaveBeenCalledOnce();
    expect(closeFirst).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("clip");
    document.body.style.overflow = "";
  });
});
