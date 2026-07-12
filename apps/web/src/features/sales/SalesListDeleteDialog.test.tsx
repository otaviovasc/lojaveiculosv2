// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SalesListDeleteDialog } from "./SalesListDeleteDialog";

describe("SalesListDeleteDialog", () => {
  afterEach(() => cleanup());

  it("presents an accessible destructive confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SalesListDeleteDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    expect(
      screen.getByRole("dialog", { name: "Excluir rascunho de venda" }),
    ).toBeVisible();
    expect(screen.getByText("Remoção permanente")).toBeVisible();
    const deleteButton = screen.getByRole("button", {
      name: "Excluir rascunho",
    });
    expect(deleteButton).toHaveClass("feature-action--danger");
    await user.click(deleteButton);
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
