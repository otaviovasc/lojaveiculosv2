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

  it("rejects zero values before calling the API", () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <FinanceEntryModal
        activeType="expense"
        entry={null}
        isOpen
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.change(screen.getByLabelText("Identificação"), {
      target: { value: "Teste de valor" },
    });
    fireEvent.change(screen.getByLabelText("Valor"), {
      target: { value: "0" },
    });

    expect(
      screen.getByRole("button", { name: "Salvar lançamento" }),
    ).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("stores the selected seller UUID instead of free text", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <FinanceEntryModal
        activeType="commission"
        entry={null}
        isOpen
        onClose={() => undefined}
        onSubmit={onSubmit}
        sellerOptions={[
          {
            detail: "Vendedor · ana@example.com",
            id: "67d470b6-6e10-4f7c-9777-73df134c175d",
            label: "Ana Vendas",
            role: "salesman",
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.change(screen.getByLabelText("Identificação"), {
      target: { value: "Comissão da venda" },
    });
    fireEvent.change(screen.getByLabelText("Valor"), {
      target: { value: "100" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Vendedor Opcional para comissões.",
      }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Ana Vendas" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar lançamento" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerUserId: "67d470b6-6e10-4f7c-9777-73df134c175d",
        type: "commission",
      }),
    );
  });
});
