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
    expect(
      await screen.findByRole("dialog", { name: /^Documento aberto:/ }),
    ).toBeVisible();
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
    expect(
      await screen.findByRole("dialog", { name: /^Documento aberto:/ }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Honda Civic/i }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: /^Documento aberto:/ }),
      ).not.toBeInTheDocument(),
    );
  });

  it("opens folder navigation through the compact action used up to 900px", async () => {
    const api = createDocumentsApiMock();

    renderDocumentsModule(api);
    fireEvent.click(await screen.findByRole("button", { name: "Pastas" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Pastas de documentos",
    });
    expect(dialog).toBeVisible();
    expect(dialog.closest(".documents-mobile-folders-backdrop")).not.toBeNull();
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

    expect(
      await screen.findByRole("dialog", { name: /^Documento aberto:/ }),
    ).toBeVisible();
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

    expect(
      await screen.findByRole("dialog", { name: /^Documento aberto:/ }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Regenerar" }),
    ).not.toBeInTheDocument();
    expect(api.regenerateDocument).not.toHaveBeenCalled();
  });

  it("announces loading while the first document page is pending", () => {
    const pending = deferred<{
      documents: WorkspaceDocument[];
      limit: number;
      offset: number;
      total: number;
    }>();
    const api = createDocumentsApiMock({
      listDocumentPage: vi.fn(() => pending.promise),
    });

    renderDocumentsModule(api);

    expect(
      screen.getByRole("status", { name: "Carregando documentos" }),
    ).toBeVisible();
  });

  it("shows a retryable error when the first document page fails", async () => {
    const api = createDocumentsApiMock({
      listDocumentPage: vi.fn(async () => {
        throw new Error("Serviço indisponível");
      }),
    });

    renderDocumentsModule(api);

    expect(
      await screen.findByText("Não foi possível carregar os documentos"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeEnabled();
  });

  it("shows the composed empty state after loading an empty workspace", async () => {
    const api = createDocumentsApiMock({
      listDocumentPage: vi.fn(async () => ({
        documents: [],
        limit: 100,
        offset: 0,
        total: 0,
      })),
    });

    renderDocumentsModule(api);

    expect(await screen.findByText("Pasta Geral vazia")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Enviar primeiro documento" }),
    ).toBeEnabled();
  });

  it("loads the next page and keeps the workspace total visible", async () => {
    const secondDocument = {
      ...documents[0]!,
      id: "document_general_2",
      title: "Segundo contrato geral",
    } satisfies WorkspaceDocument;
    const listDocumentPage = vi
      .fn<DocumentsApi["listDocumentPage"]>()
      .mockResolvedValueOnce({
        documents: [documents[0]!],
        limit: 100,
        offset: 0,
        total: 2,
      })
      .mockResolvedValueOnce({
        documents: [secondDocument],
        limit: 100,
        offset: 1,
        total: 2,
      });
    const api = createDocumentsApiMock({ listDocumentPage });

    renderDocumentsModule(api);

    expect(
      await screen.findByText("1 de 2 documentos carregados"),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));

    expect(
      (await screen.findAllByText("Segundo contrato geral"))[0],
    ).toBeVisible();
    const [lastFilters, lastRequest] = listDocumentPage.mock.calls.at(-1) ?? [];
    expect(lastFilters).toEqual({ limit: 100, offset: 1, scope: "general" });
    expect(lastRequest?.signal).toBeInstanceOf(AbortSignal);
    expect(
      screen.queryByRole("button", { name: "Carregar mais" }),
    ).not.toBeInTheDocument();
  });

  it("searches and filters documents that were not in the loaded page", async () => {
    const olderDocument = {
      ...documents[0]!,
      id: "document_older_page",
      status: "draft",
      title: "Arquivo antigo localizado",
    } satisfies WorkspaceDocument;
    const listDocumentPage = vi.fn<DocumentsApi["listDocumentPage"]>(
      async (filters = {}) => {
        if (filters.search === "arquivo antigo") {
          return {
            documents: [olderDocument],
            limit: 100,
            offset: filters.offset ?? 0,
            total: 1,
          };
        }
        return {
          documents: [documents[0]!],
          limit: 100,
          offset: 0,
          total: 201,
        };
      },
    );

    renderDocumentsModule(createDocumentsApiMock({ listDocumentPage }));

    expect(
      await screen.findByText("1 de 201 documentos carregados"),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Buscar documentos"), {
      target: { value: "arquivo antigo" },
    });

    await waitFor(() =>
      expect(listDocumentPage.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          limit: 100,
          offset: 0,
          scope: "general",
          search: "arquivo antigo",
        }),
      ),
    );
    expect(
      (await screen.findAllByText("Arquivo antigo localizado"))[0],
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Filtrar por status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Rascunho" }));

    await waitFor(() =>
      expect(listDocumentPage.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          limit: 100,
          offset: 0,
          scope: "general",
          search: "arquivo antigo",
          status: "draft",
        }),
      ),
    );
    expect(listDocumentPage.mock.calls.at(-1)?.[1]?.signal).toBeInstanceOf(
      AbortSignal,
    );
    expect(
      screen.queryByRole("button", { name: "Carregar mais" }),
    ).not.toBeInTheDocument();
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
      listDocumentPage: vi.fn(async () => ({
        documents: [regeneratable],
        limit: 100,
        offset: 0,
        total: 1,
      })),
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

  it("applies the default type to queued files and uploads them", async () => {
    const requestDocumentUpload = vi.fn(async () => ({
      expiresAt: "2026-01-01T10:15:00.000Z",
      publicUrl: "https://cdn.local/nota.pdf",
      storageKey: "documents/nota.pdf",
      uploadHeaders: {},
      uploadMethod: "PUT" as const,
      uploadUrl: "https://upload.local/nota.pdf",
    }));
    const createUploadedDocument = vi.fn(
      async () => documents[0]! satisfies WorkspaceDocument,
    );
    const api = createDocumentsApiMock({
      createUploadedDocument,
      requestDocumentUpload,
    });

    renderDocumentsModule(api);
    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar documento" }),
    );

    const defaultKindTrigger = await screen.findByRole("button", {
      name: "Tipo de documento dos novos arquivos",
    });
    fireEvent.click(defaultKindTrigger);
    fireEvent.click(await screen.findByRole("option", { name: "Nota fiscal" }));

    fireEvent.change(
      screen.getByLabelText("Selecionar documentos para envio"),
      {
        target: {
          files: [new File(["pdf"], "nota.pdf", { type: "application/pdf" })],
        },
      },
    );

    expect(
      await screen.findByRole("button", { name: "Tipo do arquivo nota.pdf" }),
    ).toHaveTextContent("Nota fiscal");

    fireEvent.click(screen.getByRole("button", { name: "Salvar documento" }));

    await waitFor(() =>
      expect(createUploadedDocument).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "invoice", title: "nota.pdf" }),
      ),
    );
  });

  it("rejects oversized files and keeps the queue empty", async () => {
    const api = createDocumentsApiMock();

    renderDocumentsModule(api);
    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar documento" }),
    );

    const oversized = new File(["x"], "grande.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversized, "size", { value: 26 * 1024 * 1024 });
    fireEvent.change(
      screen.getByLabelText("Selecionar documentos para envio"),
      { target: { files: [oversized] } },
    );

    const oversizedFileStatus = await screen.findByText(
      /excede o limite de 25 MB/,
    );
    await waitFor(() => expect(oversizedFileStatus).toBeVisible());
    expect(screen.queryByLabelText("Fila de envio")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Salvar documento" }),
    ).toBeDisabled();
  });

  it("clears the upload queue", async () => {
    const api = createDocumentsApiMock();

    renderDocumentsModule(api);
    fireEvent.click(
      await screen.findByRole("button", { name: "Enviar documento" }),
    );
    fireEvent.change(
      screen.getByLabelText("Selecionar documentos para envio"),
      {
        target: {
          files: [new File(["pdf"], "doc.pdf", { type: "application/pdf" })],
        },
      },
    );

    expect(await screen.findByLabelText("Fila de envio")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Limpar fila" }));

    expect(screen.queryByLabelText("Fila de envio")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Salvar documento" }),
    ).toBeDisabled();
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
    listDocumentPage: vi.fn(async () => ({
      documents,
      limit: 100,
      offset: 0,
      total: documents.length,
    })),
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
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
