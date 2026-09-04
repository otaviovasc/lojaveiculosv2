// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceDocument } from "../documents/types";
import { FinalizationSection } from "./SaleFinalizationSection";
import type { SaleRecord } from "./types";

const mocks = vi.hoisted(() => ({
  buildStoredDocumentsZip: vi.fn(),
  downloadStoredDocument: vi.fn(),
  listDocuments: vi.fn(),
  triggerBrowserDownload: vi.fn(),
}));

vi.mock("../documents/runtimeApi", () => ({
  createDocumentsApiOptions: vi.fn(async () => ({ fetch: vi.fn() })),
}));

vi.mock("../documents/apiClient", () => ({
  createDocumentsApi: vi.fn(() => ({
    listDocuments: mocks.listDocuments,
  })),
}));

vi.mock("./saleFinalizationDownloads", () => ({
  buildStoredDocumentsZip: mocks.buildStoredDocumentsZip,
  downloadStoredDocument: mocks.downloadStoredDocument,
  triggerBrowserDownload: mocks.triggerBrowserDownload,
}));

describe("FinalizationSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads only stored sale documents and starts a real file download", async () => {
    const user = userEvent.setup();
    const document = workspaceDocument();
    mocks.listDocuments.mockResolvedValue([document]);
    mocks.downloadStoredDocument.mockResolvedValue({
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      fileName: "contrato.pdf",
    });

    render(<FinalizationSection sale={saleRecord({ status: "closed" })} />);

    expect(
      await screen.findByText("Arquivo confirmado no repositório."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Baixar arquivo" }));

    await waitFor(() =>
      expect(mocks.triggerBrowserDownload).toHaveBeenCalledOnce(),
    );
    expect(mocks.downloadStoredDocument).toHaveBeenCalledWith(document);
    expect(mocks.listDocuments).toHaveBeenNthCalledWith(1, {
      targetId: "sale_1",
      targetType: "sale",
    });
    expect(mocks.listDocuments).toHaveBeenNthCalledWith(2, {
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Download iniciado: Contrato de Compra e Venda.",
    );
  });

  it("shows an unavailable state instead of creating a fallback file", async () => {
    mocks.listDocuments.mockResolvedValue([]);

    render(<FinalizationSection sale={saleRecord({ status: "closed" })} />);

    expect(
      await screen.findByText(
        "Documento não localizado no repositório desta venda.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Baixar arquivo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Baixar arquivos (.ZIP)" }),
    ).toBeDisabled();
    expect(mocks.triggerBrowserDownload).not.toHaveBeenCalled();
  });

  it("reports load errors and retries without marking documents available", async () => {
    const user = userEvent.setup();
    mocks.listDocuments
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([workspaceDocument()])
      .mockResolvedValueOnce([workspaceDocument()]);

    render(<FinalizationSection sale={saleRecord({ status: "closed" })} />);

    expect(
      await screen.findByText("Não foi possível carregar os documentos."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByText("Arquivo confirmado no repositório."),
    ).toBeInTheDocument();
    expect(mocks.listDocuments).toHaveBeenCalledTimes(4);
  });

  it("uses documents from an available target when the other target fails", async () => {
    mocks.listDocuments
      .mockRejectedValueOnce(new Error("sale target offline"))
      .mockResolvedValueOnce([workspaceDocument()]);

    render(<FinalizationSection sale={saleRecord({ status: "closed" })} />);

    expect(
      await screen.findByText("Arquivo confirmado no repositório."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Não foi possível carregar os documentos."),
    ).not.toBeInTheDocument();
  });

  it("keeps a failed stored-file download honest and retryable", async () => {
    const user = userEvent.setup();
    mocks.listDocuments.mockResolvedValue([workspaceDocument()]);
    mocks.downloadStoredDocument.mockRejectedValue(new Error("missing object"));

    render(<FinalizationSection sale={saleRecord({ status: "closed" })} />);
    await user.click(
      await screen.findByRole("button", { name: "Baixar arquivo" }),
    );

    expect(
      await screen.findAllByText(
        "Não foi possível baixar o arquivo armazenado.",
      ),
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Tentar download" }),
    ).toBeEnabled();
    expect(mocks.triggerBrowserDownload).not.toHaveBeenCalled();
  });

  it("reports ZIP success only for stored files recovered by the helper", async () => {
    const user = userEvent.setup();
    const document = workspaceDocument();
    mocks.listDocuments.mockResolvedValue([document]);
    mocks.buildStoredDocumentsZip.mockResolvedValue({
      blob: new Blob(["zip"], { type: "application/zip" }),
      count: 1,
      failedCount: 1,
      fileName: "documentos.zip",
    });

    render(<FinalizationSection sale={saleRecord({ status: "closed" })} />);
    await user.click(
      await screen.findByRole("button", { name: "Baixar arquivos (.ZIP)" }),
    );

    await waitFor(() =>
      expect(mocks.triggerBrowserDownload).toHaveBeenCalledOnce(),
    );
    expect(mocks.buildStoredDocumentsZip).toHaveBeenCalledWith(
      [document],
      "documentos-audi-a4-sale_1.zip",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Download do pacote iniciado com 1 documento. 1 arquivo não pôde ser recuperado.",
    );
  });
});

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    buyerSnapshot: { name: "Cliente QA" },
    closedAt: "2026-01-01T10:00:00.000Z",
    correctionOfSaleId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    documentPolicySnapshot: { requiredDocumentKinds: ["sale_contract"] },
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingId: "listing_1",
    listingSnapshot: { title: "Audi A4" },
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [],
    revision: 1,
    salePriceCents: 18990000,
    saleSourceSnapshot: { source: "lead" },
    selectedDocumentKinds: ["sale_contract"],
    sellerUserId: "seller_1",
    status: "draft",
    unitId: "unit_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function workspaceDocument(): WorkspaceDocument {
  return {
    capabilities: {
      canRegenerate: false,
      regenerateBlockReason: "document_state_unsupported",
    },
    context: {
      linkRole: "sale_contract",
      targetId: "unit_1",
      targetType: "vehicle_unit",
    },
    createdAt: "2026-01-01T10:00:00.000Z",
    file: {
      fileName: "contrato.pdf",
      fileSizeBytes: 1024,
      mimeType: "application/pdf",
    },
    id: "document_1",
    kind: "sale_contract",
    metadata: { saleId: "sale_1" },
    status: "issued",
    title: "Contrato",
    updatedAt: "2026-01-01T10:00:00.000Z",
    uploadedAt: "2026-01-01T10:00:00.000Z",
  };
}
