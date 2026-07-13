// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleCancelDialog } from "./SaleCancelDialog";

describe("SaleCancelDialog", () => {
  afterEach(() => cleanup());

  it("requires and submits an auditable reservation cancellation reason", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <SaleCancelDialog
        isOpen
        isSaving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        status="pending"
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Cancelar reserva" }),
    ).toBeVisible();
    const confirm = screen.getByRole("button", { name: "Cancelar reserva" });
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText("Motivo do cancelamento"),
      "Cliente desistiu da reserva",
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(onConfirm).toHaveBeenCalledWith("Cliente desistiu da reserva");
  });

  it("cannot be dismissed while cancellation is running", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SaleCancelDialog
        isOpen
        isSaving
        onClose={onClose}
        onConfirm={vi.fn()}
        status="pending"
      />,
    );

    await user.keyboard("{Escape}");

    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Cancelar reserva" }),
    ).toBeVisible();
  });
});
