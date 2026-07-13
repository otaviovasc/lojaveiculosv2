// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./dialog";
import { activateModalLayer } from "./dialog-accessibility";

afterEach(cleanup);

describe("Dialog", () => {
  it("exposes modal semantics, focuses content, and handles Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog onOpenChange={onOpenChange} open>
        <DialogContent>
          <DialogTitle>Register cost</DialogTitle>
          <DialogDescription>Associate a cost with the unit.</DialogDescription>
          <input aria-label="Cost description" />
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Register cost" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Cost description" }),
      ),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps focus inside the dialog and only closes the top modal", async () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    render(
      <>
        <Dialog onOpenChange={closeFirst} open>
          <DialogContent>
            <DialogTitle>First modal</DialogTitle>
            <button type="button">First action</button>
          </DialogContent>
        </Dialog>
        <Dialog onOpenChange={closeSecond} open>
          <DialogContent>
            <DialogTitle id="caller-title">Second modal</DialogTitle>
            <button type="button">Second action</button>
            <button type="button">Last action</button>
          </DialogContent>
        </Dialog>
      </>,
    );

    const second = screen.getByRole("dialog", { name: "Second modal" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Second action" }),
      ),
    );
    fireEvent.keyDown(second, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(
      screen.getAllByRole("button", { name: "Fechar" }).at(-1),
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(closeSecond).toHaveBeenCalledWith(false);
    expect(closeFirst).not.toHaveBeenCalled();
  });

  it("does not steal focus after the user moves inside the dialog", async () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Fast input</DialogTitle>
          <input aria-label="First field" />
          <input aria-label="Second field" />
        </DialogContent>
      </Dialog>,
    );

    const secondField = screen.getByRole("textbox", { name: "Second field" });
    secondField.focus();
    await nextAnimationFrame();

    expect(document.activeElement).toBe(secondField);
  });

  it("releases each modal layer only once", () => {
    document.body.style.overflow = "clip";
    const first = activateModalLayer();
    const second = activateModalLayer();

    first.release();
    first.release();
    expect(document.body.style.overflow).toBe("hidden");

    second.release();
    expect(document.body.style.overflow).toBe("clip");
    document.body.style.overflow = "";
  });
});

function nextAnimationFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}
