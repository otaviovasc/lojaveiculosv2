// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../inventory/api/apiClient";
import type { DocumentsApi } from "./apiClient";
import { DocumentsModule } from "./DocumentsModule";
import type {
  DocumentDownload,
  DocumentTemplate,
  DocumentVersion,
  WorkspaceDocument,
} from "./types";

describe("DocumentsModule", () => {
  beforeAll(() => {
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: matchMedia,
      writable: true,
    });
    Object.defineProperty(globalThis, "matchMedia", {
      configurable: true,
      value: matchMedia,
      writable: true,
    });

    class IntersectionObserverMock implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly scrollMargin = "";
      readonly thresholds = [];
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }

    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: IntersectionObserverMock,
      writable: true,
    });
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      value: IntersectionObserverMock,
      writable: true,
    });
  });

  afterEach(() => {
    window.location.hash = "#/";
    cleanup();
  });

  it("opens a vehicle folder and stored document from a deep link", async () => {
    const api = createDocumentsApiMock();
    window.location.hash = "#/documents?unitId=unit_1&documentId=document_unit";

    renderDocumentsModule(api);

    expect(
      await screen.findByRole("heading", { name: "Honda Civic" }),
    ).toBeVisible();
    expect(await screen.findByLabelText("Documento aberto")).toBeVisible();
    expect(api.downloadDocument).toHaveBeenCalledWith("document_unit", {
      disposition: "inline",
    });
  });

  it("closes the open preview when selecting another folder", async () => {
    const api = createDocumentsApiMock();

    renderDocumentsModule(api);

    fireEvent.click(
      await screen.findByRole("button", { name: /Contrato geral/i }),
    );
    expect(await screen.findByLabelText("Documento aberto")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Honda Civic/i }));

    await waitFor(() =>
      expect(
        screen.queryByLabelText("Documento aberto"),
      ).not.toBeInTheDocument(),
    );
  });

  it("keeps document actions available when PDF preview loading fails", async () => {
    const api = createDocumentsApiMock({
      downloadDocument: vi.fn(async () => {
        throw new Error("Documento indisponivel.");
      }),
    });

    renderDocumentsModule(api);

    fireEvent.click(
      await screen.findByRole("button", { name: /Contrato geral/i }),
    );

    expect(await screen.findByLabelText("Documento aberto")).toBeVisible();
    expect(
      await screen.findByText(
        "A prévia não está disponível. Tente novamente ou gerencie os dados do documento.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeEnabled();
    expect(
      screen.queryByText("Não foi possível carregar os documentos"),
    ).not.toBeInTheDocument();
  });

  it("does not expose regeneration when the API reports no safe renderer", async () => {
    const api = createDocumentsApiMock();

    renderDocumentsModule(api);
    fireEvent.click(
      await screen.findByRole("button", { name: /Contrato geral/i }),
    );

    expect(await screen.findByLabelText("Documento aberto")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Regenerar" }),
    ).not.toBeInTheDocument();
    expect(api.regenerateDocument).not.toHaveBeenCalled();
  });

  it("exposes regeneration when the API reports a registered renderer", async () => {
    const regeneratable = {
      ...documents[0]!,
      capabilities: {
        canRegenerate: true,
        regenerateBlockReason: null,
      },
    } satisfies WorkspaceDocument;
    const regenerateDocument = vi.fn(async () => regeneratable);
    const api = createDocumentsApiMock({
      listDocuments: vi.fn(async () => [regeneratable]),
      regenerateDocument,
    });

    renderDocumentsModule(api);
    fireEvent.click(
      await screen.findByRole("button", { name: /Contrato geral/i }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Regenerar" }));

    await waitFor(() =>
      expect(regenerateDocument).toHaveBeenCalledWith("document_general"),
    );
  });
});

function renderDocumentsModule(api: DocumentsApi) {
  render(<DocumentsModule api={api} inventoryApi={createInventoryApiMock()} />);
}

function createDocumentsApiMock(
  overrides: Partial<DocumentsApi> = {},
): DocumentsApi {
  return {
    createUploadedDocument: vi.fn(async () => {
      throw new Error("Unexpected create uploaded document");
    }),
    createUnitUploadedDocument: vi.fn(async () => {
      throw new Error("Unexpected create unit uploaded document");
    }),
    deleteDocument: vi.fn(async () => {
      throw new Error("Unexpected delete document");
    }),
    downloadDocument: vi.fn(async (documentId) =>
      createDocumentDownload(documentById(documentId)),
    ),
    listDocuments: vi.fn(async () => documents),
    listTemplates: vi.fn(async (): Promise<DocumentTemplate[]> => []),
    listVersions: vi.fn(async (): Promise<DocumentVersion[]> => []),
    previewDocument: vi.fn(async () => {
      throw new Error("Unexpected preview document");
    }),
    regenerateDocument: vi.fn(async () => {
      throw new Error("Unexpected regenerate document");
    }),
    requestDocumentUpload: vi.fn(async () => {
      throw new Error("Unexpected request document upload");
    }),
    requestUnitDocumentUpload: vi.fn(async () => {
      throw new Error("Unexpected request unit document upload");
    }),
    recordTemplateSuggestionOutcome: vi.fn(async () => ({
      recordedAt: "2026-01-01T10:00:00.000Z",
    })),
    suggestTemplateEdit: vi.fn(async () => {
      throw new Error("Unexpected suggest template edit");
    }),
    updateDocument: vi.fn(async () => {
      throw new Error("Unexpected update document");
    }),
    updateTemplate: vi.fn(async () => {
      throw new Error("Unexpected update template");
    }),
    voidDocument: vi.fn(async () => {
      throw new Error("Unexpected void document");
    }),
    ...overrides,
  };
}

function createInventoryApiMock(): InventoryApi {
  return {
    listListings: vi.fn(async () => ({
      hasMore: false,
      items: [],
      nextOffset: null,
      total: 0,
    })),
  } as unknown as InventoryApi;
}

function createDocumentDownload(document: WorkspaceDocument): DocumentDownload {
  return {
    document,
    downloadMethod: "GET",
    downloadUrl: `https://download.local/${document.id}.pdf`,
    expiresAt: "2026-01-01T10:05:00.000Z",
    fileName: document.file.fileName,
    mimeType: document.file.mimeType,
    versionId: `${document.id}_version_1`,
    versionNumber: 1,
  };
}

function documentById(documentId: string) {
  const document = documents.find((item) => item.id === documentId);
  if (!document) throw new Error(`Unknown document ${documentId}`);
  return document;
}

const documents: WorkspaceDocument[] = [
  {
    capabilities: {
      canRegenerate: false,
      regenerateBlockReason: "renderer_unavailable",
    },
    context: {
      linkRole: "sale_contract",
      targetId: "sale_1",
      targetType: "sale",
    },
    createdAt: "2026-01-01T10:00:00.000Z",
    file: {
      fileName: "contrato-geral.pdf",
      fileSizeBytes: 1024,
      mimeType: "application/pdf",
    },
    id: "document_general",
    kind: "sale_contract",
    metadata: {},
    status: "issued",
    title: "Contrato geral",
    updatedAt: "2026-01-01T10:00:00.000Z",
    uploadedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    capabilities: {
      canRegenerate: false,
      regenerateBlockReason: "renderer_unavailable",
    },
    context: {
      linkRole: "primary",
      targetId: "unit_1",
      targetType: "vehicle_unit",
    },
    createdAt: "2026-01-01T11:00:00.000Z",
    file: {
      fileName: "documento-unidade.pdf",
      fileSizeBytes: 2048,
      mimeType: "application/pdf",
    },
    id: "document_unit",
    kind: "vehicle_registration",
    metadata: {
      plate: "ABC1D23",
      unitId: "unit_1",
      vehicleLabel: "Honda Civic",
    },
    status: "issued",
    title: "Documento da unidade",
    updatedAt: "2026-01-01T11:00:00.000Z",
    uploadedAt: "2026-01-01T11:00:00.000Z",
  },
];
