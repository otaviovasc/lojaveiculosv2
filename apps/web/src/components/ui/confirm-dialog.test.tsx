// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

afterEach(cleanup);

describe("ConfirmDialog", () => {
  it("exposes a labelled modal and gives the safe action initial focus", async () => {
    render(
      <ConfirmDialog
        description="This cannot be undone."
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete vehicle"
        variant="destructive"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Delete vehicle" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(
      document.getElementById(dialog.getAttribute("aria-describedby") ?? "")
        ?.textContent,
    ).toBe("This cannot be undone.");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Cancelar" }),
      ),
    );
  });

  it("traps focus, restores body overflow, and ignores Escape while closed", async () => {
    const onClose = vi.fn();
    document.body.style.overflow = "clip";
    const { rerender } = render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Archive vehicle"
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Archive vehicle" });
    const confirm = screen.getByRole("button", { name: "Confirmar" });
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    confirm.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Cancelar" }),
    );

    rerender(
      <ConfirmDialog
        isOpen={false}
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Archive vehicle"
      />,
    );
    await waitFor(() => expect(document.body.style.overflow).toBe("clip"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    document.body.style.overflow = "";
  });
});
