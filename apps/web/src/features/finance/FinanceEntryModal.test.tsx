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
import { FinanceEntryModal } from "./FinanceEntryModal";

afterEach(cleanup);

describe("FinanceEntryModal", () => {
  it("keeps the stepped form behavior inside the shared dialog", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn(async () => undefined);
    render(
      <FinanceEntryModal
        activeType="expense"
        entry={null}
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Novo lançamento" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.change(screen.getByLabelText("Identificação"), {
      target: { value: "Aluguel da loja" },
    });
    fireEvent.change(screen.getByLabelText("Valor"), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar lançamento" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "2500",
        category: "Operacional",
        name: "Aluguel da loja",
        type: "expense",
      }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
