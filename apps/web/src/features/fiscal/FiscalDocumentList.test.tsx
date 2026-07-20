// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FiscalApi } from "./apiClient";
import { FiscalDocumentList } from "./FiscalDocumentList";
import type { FiscalStatusFilter } from "./fiscalDocumentDisplay";
import type { FiscalDocument } from "./types";

vi.mock("../../components/ui/AnimatedContent", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
);

describe("FiscalDocumentList", () => {
  afterEach(cleanup);

  it("filters by text search across recipient, key and reference", () => {
    renderList();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Maria Silva")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar documento fiscal"), {
      target: { value: "Parceira" },
    });
    expect(within(table).queryByText("Maria Silva")).not.toBeInTheDocument();
    expect(within(table).getByText("Loja Parceira")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar documento fiscal"), {
      target: { value: "9000123" },
    });
    expect(within(table).getByText("Maria Silva")).toBeInTheDocument();
  });

  it("filters by document type and status", () => {
    renderList();
    const table = screen.getByRole("table");

    fireEvent.click(
      screen.getByRole("button", { name: "Filtrar por tipo de documento" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "NFS-e" }));
    expect(within(table).queryByText("Maria Silva")).not.toBeInTheDocument();
    expect(within(table).getByText("Financeira ABC")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Filtrar por tipo de documento" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Todos os tipos" }));
    fireEvent.click(screen.getByRole("button", { name: "Filtrar por status" }));
    fireEvent.click(screen.getByRole("option", { name: "Rejeitadas" }));
    expect(within(table).queryByText("Maria Silva")).not.toBeInTheDocument();
    expect(within(table).getByText("Loja Parceira")).toBeInTheDocument();
  });

  it("polls the provider while pending documents exist and stops otherwise", async () => {
    vi.useFakeTimers();
    try {
      const { api } = renderList();
      expect(api.syncDocumentStatus).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(api.syncDocumentStatus).toHaveBeenCalledTimes(1);
      expect(api.syncDocumentStatus).toHaveBeenCalledWith("doc_queued", {});

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(api.syncDocumentStatus).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not poll when no document is pending", async () => {
    vi.useFakeTimers();
    try {
      const { api } = renderList({
        documents: createDocuments().filter(
          (document) => document.id !== "doc_queued",
        ),
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(api.syncDocumentStatus).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("gates cancellation to cancellable documents and requires a reason", async () => {
    const { api, onRefresh } = renderList();
    const table = screen.getByRole("table");

    // Issued NF-e and NFS-e can be cancelled; the rejected one cannot.
    const cancelButtons = within(table).getAllByRole("button", {
      name: /^Cancelar /,
    });
    expect(cancelButtons).toHaveLength(2);

    fireEvent.click(cancelButtons[0]!);
    const reason = within(table).getByLabelText("Motivo do cancelamento");
    const confirm = within(table).getByRole("button", {
      name: "Confirmar cancelamento",
    });
    expect(confirm).toBeDisabled();

    fireEvent.change(reason, { target: { value: "Erro no destinatário" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(api.cancelDocument).toHaveBeenCalledWith("doc_issued", {
        reason: "Erro no destinatário",
      }),
    );
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it("highlights rejected documents and offers corrigir e reenviar", () => {
    const { onCorrect } = renderList();
    const table = screen.getByRole("table");

    expect(within(table).getByText(/CFOP inválido/)).toBeInTheDocument();
    const correct = within(table).getByRole("button", {
      name: /Corrigir e reenviar/,
    });
    fireEvent.click(correct);
    expect(onCorrect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "doc_rejected" }),
    );
  });

  it("syncs status manually for pending documents only", () => {
    const { api } = renderList();
    const table = screen.getByRole("table");

    const syncButtons = within(table).getAllByRole("button", {
      name: /^Atualizar status/,
    });
    expect(syncButtons).toHaveLength(1);
    fireEvent.click(syncButtons[0]!);
    expect(api.syncDocumentStatus).toHaveBeenCalledWith("doc_queued", {});
  });
});

function renderList(overrides?: { documents?: FiscalDocument[] }) {
  const api = createListApi();
  const onCorrect = vi.fn();
  const onError = vi.fn();
  const onRefresh = vi.fn(async () => {});
  const documents = overrides?.documents ?? createDocuments();

  function Harness() {
    const [statusFilter, setStatusFilter] = useState<FiscalStatusFilter>("all");
    return (
      <FiscalDocumentList
        api={api}
        documents={documents}
        onCorrect={onCorrect}
        onError={onError}
        onRefresh={onRefresh}
        onStatusFilterChange={setStatusFilter}
        statusFilter={statusFilter}
      />
    );
  }

  render(<Harness />);
  return { api, onCorrect, onError, onRefresh };
}

function createListApi(): FiscalApi {
  return {
    archiveRecipient: vi.fn(),
    archiveTemplate: vi.fn(),
    cancelDocument: vi.fn(async (_id: string) => createDocuments()[0]!),
    createRecipient: vi.fn(),
    createTemplate: vi.fn(),
    getOverview: vi.fn(),
    issueDocument: vi.fn(),
    listRecipients: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
    previewTemplate: vi.fn(),
    repeatDocument: vi.fn(async () => createDocuments()[0]!),
    syncDocumentStatus: vi.fn(async (id: string) =>
      createDocuments().find((document) => document.id === id),
    ),
  } as unknown as FiscalApi;
}

function createDocuments(): FiscalDocument[] {
  return [
    {
      accessKey: "35240123456789000123456789000123456789000123",
      createdAt: "2026-07-10T12:00:00.000Z",
      documentKind: "nfe",
      documentType: "nfe_vehicle_sale",
      id: "doc_issued",
      issuedAt: "2026-07-10T12:30:00.000Z",
      metadata: {
        externalReference: "sale:sale_1",
        recipient: { document: "12345678900", name: "Maria Silva" },
        vehicleNfe: { sale: { price: 85000 } },
      },
      provider: "spedy",
      providerDocumentId: "spedy_1",
      recipientId: null,
      status: "issued",
      templateId: null,
      templateVersion: null,
    },
    {
      accessKey: null,
      createdAt: "2026-07-11T09:00:00.000Z",
      documentKind: "nfe",
      documentType: "nfe_vehicle_sale",
      id: "doc_queued",
      issuedAt: null,
      metadata: {
        externalReference: "sale:sale_2",
        recipient: { document: "98765432000100", name: "Oficina Central" },
      },
      provider: "spedy",
      providerDocumentId: "spedy_2",
      recipientId: null,
      status: "queued",
      templateId: null,
      templateVersion: null,
    },
    {
      accessKey: null,
      createdAt: "2026-07-09T15:00:00.000Z",
      documentKind: "nfe",
      documentType: "nfe_vehicle_sale",
      id: "doc_rejected",
      issuedAt: null,
      metadata: {
        externalReference: "sale:sale_3",
        message: "CFOP inválido para a operação",
        recipient: { document: "11222333000144", name: "Loja Parceira" },
      },
      provider: "spedy",
      providerDocumentId: "spedy_3",
      recipientId: null,
      status: "rejected",
      templateId: null,
      templateVersion: null,
    },
    {
      accessKey: null,
      createdAt: "2026-07-08T10:00:00.000Z",
      documentKind: "nfse",
      documentType: "nfse_service_commission",
      id: "doc_nfse",
      issuedAt: "2026-07-08T10:05:00.000Z",
      metadata: {
        competence: "2026-07",
        grossAmount: 1500,
        recipient: { document: "55666777000188", name: "Financeira ABC" },
      },
      provider: "spedy",
      providerDocumentId: "spedy_4",
      recipientId: "rec_1",
      status: "issued",
      templateId: "tpl_1",
      templateVersion: 2,
    },
  ];
}
