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
import type { FinanceApi } from "./apiClient";
import { FinanceEntryModal } from "./FinanceEntryModal";
import type { FinanceEntry, FinanceRecurringEntry } from "./types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  const urlStatics = URL as unknown as Record<string, unknown>;
  delete urlStatics.createObjectURL;
  delete urlStatics.revokeObjectURL;
});

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
      target: { value: "250000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar lançamento" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "2500.00",
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
      target: { value: "10000" },
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

  it("lists attached documents in edit mode and opens them in a new tab", async () => {
    const openMock = vi.fn(() => ({}));
    vi.stubGlobal("open", openMock);
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:receipt"),
      revokeObjectURL: vi.fn(),
    });
    const api = createModalApi({
      documents: [
        {
          fileName: "despachante.pdf",
          id: "document_1",
          kind: "finance_receipt",
          mimeType: "application/pdf",
          title: "Comprovante do despachante",
        },
      ],
    });
    render(
      <FinanceEntryModal
        activeType="expense"
        api={api}
        entry={expenseEntry()}
        isOpen
        onClose={() => undefined}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(api.getEntryDetail).toHaveBeenCalledWith("entry_1");
    expect(
      await screen.findByText("Comprovante do despachante"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Abrir comprovante Comprovante do despachante",
      }),
    );

    await waitFor(() =>
      expect(api.openEntryDocument).toHaveBeenCalledWith(
        "entry_1",
        "document_1",
      ),
    );
    await waitFor(() =>
      expect(openMock).toHaveBeenCalledWith(
        "blob:receipt",
        "_blank",
        "noopener,noreferrer",
      ),
    );
  });

  it("shows the empty documents state when the entry has no receipts", async () => {
    const api = createModalApi({ documents: [] });
    render(
      <FinanceEntryModal
        activeType="expense"
        api={api}
        entry={expenseEntry()}
        isOpen
        onClose={() => undefined}
        onSubmit={vi.fn(async () => undefined)}
      />,
    );

    expect(
      await screen.findByText("Nenhum comprovante anexado."),
    ).toBeInTheDocument();
  });

  it("edits a recurring template without receipt or payment fields", async () => {
    const onSubmit = vi.fn(async () => undefined);
    render(
      <FinanceEntryModal
        activeType="expense"
        entry={null}
        isOpen
        onClose={() => undefined}
        onSubmit={onSubmit}
        recurringEntry={recurringEntry()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Editar recorrência" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Comprovante opcional")).not.toBeInTheDocument();
    expect(screen.queryByText("Comprovantes anexados")).not.toBeInTheDocument();
    expect(screen.queryByText("Status inicial")).not.toBeInTheDocument();
    expect(screen.queryByText("Pagamento")).not.toBeInTheDocument();
    expect(screen.getByText("Frequência")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salvar recorrência" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Aluguel do pátio",
        recurrence: "recurring",
        recurrenceDay: "10",
        recurrenceFrequency: "monthly",
        recurrenceOccurrences: "5",
      }),
    );
  });
});

function expenseEntry(overrides: Partial<FinanceEntry> = {}): FinanceEntry {
  return {
    amountCents: 250000,
    category: "Operacional",
    dueAt: "2026-07-10T12:00:00.000Z",
    id: "entry_1",
    name: "Aluguel da loja",
    paidAt: null,
    sellerUserId: null,
    status: "pending",
    type: "expense",
    ...overrides,
  };
}

function recurringEntry(
  overrides: Partial<FinanceRecurringEntry> = {},
): FinanceRecurringEntry {
  return {
    amountCents: 123450,
    category: "Aluguel",
    dayOfMonth: 10,
    frequency: "monthly",
    id: "rec_1",
    metadata: { generatedCount: 1, occurrences: 5 },
    name: "Aluguel do pátio",
    nextDueAt: "2026-07-10T12:00:00.000Z",
    sellerUserId: null,
    status: "pending",
    type: "expense",
    ...overrides,
  };
}

function createModalApi({
  documents,
}: {
  documents: readonly unknown[];
}): FinanceApi {
  const api = {
    getEntryDetail: vi.fn(async () => ({
      documents,
      entry: expenseEntry(),
      links: [],
    })),
    openEntryDocument: vi.fn(async () => new Blob(["%PDF-1.4"])),
  };
  return api as unknown as FinanceApi;
}
