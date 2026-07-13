// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleRevertDialog } from "./SaleRevertDialog";

describe("SaleRevertDialog", () => {
  afterEach(() => cleanup());

  it("explains immutable correction and requires an auditable reason", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <SaleRevertDialog
        isOpen
        isSaving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Reverter venda fechada",
    });
    expect(dialog).toHaveTextContent("A venda original será preservada");
    const confirm = screen.getByRole("button", { name: "Reverter venda" });
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText("Motivo da correção"),
      "Corrigir nome do comprador",
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(onConfirm).toHaveBeenCalledWith("Corrigir nome do comprador");
  });
});
