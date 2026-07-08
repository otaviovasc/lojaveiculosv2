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
import type { DocumentsModule as DocumentsModuleComponent } from "./DocumentsModule";
import type {
  DocumentDownload,
  DocumentTemplate,
  DocumentVersion,
  WorkspaceDocument,
} from "./types";

let DocumentsModule: typeof DocumentsModuleComponent;

describe("DocumentsModule", () => {
  beforeAll(async () => {
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

    DocumentsModule = (await import("./DocumentsModule")).DocumentsModule;
  });

  afterEach(cleanup);

  it("closes the open preview when selecting another folder", async () => {
    const api = createDocumentsApiMock();

    renderDocumentsModule(api);

    fireEvent.click(await screen.findByText("Contrato geral"));
    expect(await screen.findByLabelText("Documento aberto")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Honda Civic/i }));

    await waitFor(() =>
      expect(
        screen.queryByLabelText("Documento aberto"),
      ).not.toBeInTheDocument(),
    );
  });

  it("closes the detail panel when PDF preview loading fails", async () => {
    const api = createDocumentsApiMock({
      downloadDocument: vi.fn(async () => {
        throw new Error("Documento indisponivel.");
      }),
    });

    renderDocumentsModule(api);

    fireEvent.click(await screen.findByText("Contrato geral"));

    await waitFor(() =>
      expect(
        screen.queryByLabelText("Documento aberto"),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Documento indisponivel.")).toBeVisible();
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
