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
import { AppApiError } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import { FiscalDocumentList } from "./FiscalDocumentList";
import type { FiscalStatusFilter } from "./fiscalDocumentDisplay";
import type { FiscalDocument, FiscalEvent } from "./types";

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
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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
    fireEvent.click(screen.getByRole("button", { name: /Rejeitadas/ }));
    expect(within(table).queryByText("Maria Silva")).not.toBeInTheDocument();
    expect(within(table).getByText("Loja Parceira")).toBeInTheDocument();
  });

  it("polls the provider while pending documents exist and stops otherwise", async () => {
    vi.useFakeTimers();
    try {
      const { api } = renderList();
      await act(async () => Promise.resolve());
      expect(api.syncDocumentStatus).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(api.syncDocumentStatus).toHaveBeenCalledTimes(2);
      expect(api.syncDocumentStatus).toHaveBeenCalledWith("doc_queued", {});

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(api.syncDocumentStatus).toHaveBeenCalledTimes(3);
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
    expect(cancelButtons[0]).toHaveAttribute("aria-expanded", "true");
    expect(cancelButtons[0]).toHaveAttribute(
      "aria-controls",
      "fiscal-cancel-desktop-doc_issued",
    );
    const reason = within(table).getByLabelText("Motivo do cancelamento");
    expect(reason).toHaveFocus();
    const confirm = within(table).getByRole("button", {
      name: "Confirmar cancelamento",
    });
    expect(reason).toHaveAttribute(
      "placeholder",
      "Motivo do cancelamento (mín. 15 caracteres)",
    );
    expect(confirm).toBeDisabled();

    fireEvent.change(reason, { target: { value: "Breve" } });
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

  it("creates a review draft only from issued documents and opens it", async () => {
    const { api, onCorrect } = renderList();
    const table = screen.getByRole("table");
    const repeat = within(table).getAllByRole("button", {
      name: /^Criar nova /,
    });

    expect(repeat).toHaveLength(2);
    fireEvent.click(repeat[0]!);

    await waitFor(() =>
      expect(api.repeatDocument).toHaveBeenCalledWith("doc_issued"),
    );
    await waitFor(() =>
      expect(onCorrect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "doc_issued" }),
      ),
    );
  });

  it("shows safe document details and status history on demand", () => {
    renderList();
    const table = screen.getByRole("table");

    fireEvent.click(
      within(table).getByRole("button", {
        name: /Mostrar detalhes.*sale:sale_1/,
      }),
    );

    expect(within(table).getByText("Detalhes fiscais")).toBeInTheDocument();
    expect(
      within(table).getByText("35240123456789000123456789000123456789000123"),
    ).toBeInTheDocument();
    expect(within(table).getByText("Status atualizado")).toBeInTheDocument();
    expect(
      within(table).queryByText("provider_private"),
    ).not.toBeInTheDocument();
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

  it("hides mutation actions that the server capability denies", async () => {
    const { api } = renderList({
      capabilities: {
        canCancelDocuments: false,
        canRepeatDocuments: false,
        canSyncDocumentStatus: false,
      },
    });
    await act(async () => Promise.resolve());
    const table = screen.getByRole("table");

    expect(
      within(table).queryByRole("button", { name: /^Cancelar / }),
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: /^Criar nova / }),
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: /^Corrigir e reenviar / }),
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: /^Atualizar status / }),
    ).not.toBeInTheDocument();
    expect(api.syncDocumentStatus).not.toHaveBeenCalled();
  });

  it("downloads official PDF/XML bytes for issued documents", async () => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fiscal-artifact"),
      revokeObjectURL: vi.fn(),
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const { api } = renderList();
    const table = screen.getByRole("table");

    fireEvent.click(
      within(table).getAllByRole("button", {
        name: /^Baixar PDF oficial do documento fiscal/,
      })[0]!,
    );

    await waitFor(() =>
      expect(api.downloadDocumentArtifact).toHaveBeenCalledWith(
        "doc_issued",
        "pdf",
      ),
    );
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(within(table).getByRole("status")).toHaveTextContent(
      "Download do PDF oficial iniciado.",
    );
  });

  it("keeps unavailable artifacts visible and disabled", () => {
    renderList();
    const table = screen.getByRole("table");

    expect(
      within(table).getByRole("button", {
        name: /PDF oficial indisponível.*Disponível após a autorização/,
      }),
    ).toBeDisabled();
    expect(
      within(table).getByRole("button", {
        name: /XML oficial indisponível.*O provedor não disponibilizou/,
      }),
    ).toBeDisabled();
  });

  it("keeps download actions disabled without the server capability", () => {
    renderList({ canDownloadOfficialArtifacts: false });
    const table = screen.getByRole("table");

    expect(
      within(table).getAllByRole("button", {
        name: /PDF oficial indisponível.*Sem permissão/,
      })[0],
    ).toBeDisabled();
  });

  it("shows a correlated per-row error when official bytes are unavailable", async () => {
    const { api } = renderList();
    vi.mocked(api.downloadDocumentArtifact).mockRejectedValueOnce(
      new AppApiError({
        code: "FISCAL_ARTIFACT_UNAVAILABLE",
        message: "Official artifact unavailable.",
        requestId: "request_fiscal_1",
        status: 409,
        userMessage: "O arquivo oficial ainda não está disponível.",
      }),
    );
    const table = screen.getByRole("table");

    fireEvent.click(
      within(table).getAllByRole("button", {
        name: /^Baixar XML oficial do documento fiscal/,
      })[0]!,
    );

    expect(await within(table).findByRole("alert")).toHaveTextContent(
      "O arquivo oficial ainda não está disponível. ID do erro: request_fiscal_1",
    );
  });
});

function renderList(overrides?: {
  canDownloadOfficialArtifacts?: boolean;
  capabilities?: {
    canCancelDocuments?: boolean;
    canRepeatDocuments?: boolean;
    canSyncDocumentStatus?: boolean;
  };
  documents?: FiscalDocument[];
}) {
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
        capabilities={{
          canCancelDocuments:
            overrides?.capabilities?.canCancelDocuments ?? true,
          canDownloadOfficialArtifacts:
            overrides?.canDownloadOfficialArtifacts ?? true,
          canIssueDocuments: true,
          canRepeatDocuments:
            overrides?.capabilities?.canRepeatDocuments ?? true,
          canSyncDocumentStatus:
            overrides?.capabilities?.canSyncDocumentStatus ?? true,
        }}
        canDownloadOfficialArtifacts={
          overrides?.canDownloadOfficialArtifacts ?? true
        }
        documents={documents}
        events={createEvents()}
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

function createEvents(): FiscalEvent[] {
  return [
    {
      eventType: "status_changed",
      fiscalDocumentId: "doc_issued",
      occurredAt: "2026-07-10T12:30:00.000Z",
    },
  ];
}

function createListApi(): FiscalApi {
  return {
    archiveRecipient: vi.fn(),
    archiveTemplate: vi.fn(),
    cancelDocument: vi.fn(async (_id: string) => createDocuments()[0]!),
    createRecipient: vi.fn(),
    createTemplate: vi.fn(),
    downloadDocumentArtifact: vi.fn(async (_id, format) => ({
      blob: new Blob([format === "pdf" ? "%PDF-1.7" : "<nfe />"]),
      contentType: format === "pdf" ? "application/pdf" : "application/xml",
      fileName: `nota.${format}`,
    })),
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
      hasProviderReference: true,
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
      hasProviderReference: true,
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
      hasProviderReference: true,
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
      hasProviderReference: true,
      recipientId: "rec_1",
      status: "issued",
      templateId: "tpl_1",
      templateVersion: 2,
    },
  ];
}
