// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../inventory/api/apiClient";
import type { DocumentsApi } from "./apiClient";
import { DocumentsModule } from "./DocumentsModule";
import type {
  DocumentTemplate,
  DocumentVersion,
  WorkspaceDocument,
} from "./types";

describe("DocumentsModule folder switching", () => {
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
  });

  afterEach(() => {
    window.location.hash = "#/";
    cleanup();
  });

  it("shows only the selected vehicle's documents after switching folders", async () => {
    render(
      <DocumentsModule
        api={createDocumentsApiMock()}
        inventoryApi={createInventoryApiMock()}
      />,
    );

    // Wait for the workspace to finish loading.
    expect(
      await screen.findByRole("button", { name: /Honda Civic/i }),
    ).toBeVisible();

    const table = () => screen.getByRole("table");

    // General folder is the default: only general docs, no duplicates from
    // multi-link documents (same id returned once per link).
    await waitFor(() =>
      expect(within(table()).getByText("Contrato geral")).toBeVisible(),
    );
    expect(within(table()).getAllByText("Doc duplo")).toHaveLength(1);
    expect(within(table()).queryByText("Doc Civic")).not.toBeInTheDocument();
    expect(within(table()).queryByText("Doc Corolla")).not.toBeInTheDocument();

    // Switch to Honda Civic folder: only its docs, each once.
    fireEvent.click(screen.getByRole("button", { name: /Honda Civic/i }));
    await waitFor(() =>
      expect(within(table()).getByText("Doc Civic")).toBeVisible(),
    );
    expect(within(table()).getAllByText("Doc multi")).toHaveLength(1);
    expect(
      within(table()).queryByText("Contrato geral"),
    ).not.toBeInTheDocument();
    expect(within(table()).queryByText("Doc Corolla")).not.toBeInTheDocument();
    expect(within(table()).queryByText("Doc duplo")).not.toBeInTheDocument();

    // Visit the empty Ford Ka folder.
    fireEvent.click(screen.getByRole("button", { name: /Ford Ka/i }));
    expect(await screen.findByText("Unidade sem documentos")).toBeVisible();

    // Back to Honda Civic: still only its docs.
    fireEvent.click(screen.getByRole("button", { name: /Honda Civic/i }));
    await waitFor(() =>
      expect(within(table()).getByText("Doc Civic")).toBeVisible(),
    );
    expect(within(table()).getAllByText("Doc multi")).toHaveLength(1);
    expect(
      within(table()).queryByText("Contrato geral"),
    ).not.toBeInTheDocument();
    expect(within(table()).queryByText("Doc Corolla")).not.toBeInTheDocument();
    expect(within(table()).queryByText("Doc duplo")).not.toBeInTheDocument();
  }, 15_000);

  it("filters vehicle folders by lifecycle status", async () => {
    render(
      <DocumentsModule
        api={createDocumentsApiMock()}
        inventoryApi={createInventoryApiMock()}
      />,
    );

    expect(
      await screen.findByRole("button", { name: /Honda Civic/i }),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Filtrar pastas por fase do veículo",
      }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "Vendido" }));

    expect(
      screen.getByRole("button", { name: /Toyota Corolla/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Honda Civic/i }),
    ).not.toBeInTheDocument();
  });

  it("aborts and ignores a stale folder response", async () => {
    const civicPage =
      deferred<Awaited<ReturnType<DocumentsApi["listDocumentPage"]>>>();
    let civicSignal: AbortSignal | undefined;
    const listDocumentPage = vi.fn<DocumentsApi["listDocumentPage"]>(
      async (filters = {}, request = {}) => {
        if (filters.targetId === "unit_1") {
          civicSignal = request.signal;
          return civicPage.promise;
        }
        if (filters.targetId === "unit_2") {
          return pageWith(documentByTitle("Doc Corolla"));
        }
        return pageWith(documentByTitle("Contrato geral"));
      },
    );
    render(
      <DocumentsModule
        api={createDocumentsApiMock({ listDocumentPage })}
        inventoryApi={createInventoryApiMock()}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /Honda Civic/i }),
    );
    await waitFor(() => expect(civicSignal).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Toyota Corolla/i }));

    expect((await screen.findAllByText("Doc Corolla"))[0]).toBeVisible();
    expect(civicSignal?.aborted).toBe(true);
    civicPage.resolve(pageWith(documentByTitle("Doc Civic")));
    await Promise.resolve();

    expect(screen.getAllByText("Doc Corolla")[0]).toBeVisible();
    expect(screen.queryByText("Doc Civic")).not.toBeInTheDocument();
  });
});

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
    downloadDocument: vi.fn(async () => {
      throw new Error("Unexpected download document");
    }),
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

function pageWith(document: WorkspaceDocument) {
  return { documents: [document], limit: 100, offset: 0, total: 1 };
}

function documentByTitle(title: string) {
  const document = documents.find((item) => item.title === title);
  if (!document) throw new Error(`Missing test document: ${title}`);
  return document;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createInventoryApiMock(): InventoryApi {
  return {
    listListings: vi.fn(async () => ({
      hasMore: false,
      items: [
        {
          listing: { id: "listing_1", plate: "ABC1D23", title: "Honda Civic" },
          mediaCount: 0,
          primaryMediaUrl: null,
          primaryUnit: null,
          units: [
            {
              id: "unit_1",
              plate: "ABC1D23",
              status: "available",
              stockNumber: "ST-1",
              vin: null,
            },
          ],
        },
        {
          listing: {
            id: "listing_2",
            plate: "DEF2E34",
            title: "Toyota Corolla",
          },
          mediaCount: 0,
          primaryMediaUrl: null,
          primaryUnit: null,
          units: [
            {
              id: "unit_2",
              plate: "DEF2E34",
              status: "sold",
              stockNumber: "ST-2",
              vin: null,
            },
          ],
        },
        {
          listing: { id: "listing_3", plate: "GHI3F45", title: "Ford Ka" },
          mediaCount: 0,
          primaryMediaUrl: null,
          primaryUnit: null,
          units: [
            {
              id: "unit_3",
              plate: "GHI3F45",
              status: "in_preparation",
              stockNumber: "ST-3",
              vin: null,
            },
          ],
        },
      ],
      nextOffset: null,
      total: 3,
    })),
  } as unknown as InventoryApi;
}

function vehicleDocument(
  id: string,
  title: string,
  unitId: string,
  plate: string,
  vehicleLabel: string,
): WorkspaceDocument {
  return {
    capabilities: {
      canRegenerate: false,
      regenerateBlockReason: "renderer_unavailable",
    },
    context: {
      linkRole: "primary",
      targetId: unitId,
      targetType: "vehicle_unit",
    },
    createdAt: "2026-01-01T11:00:00.000Z",
    file: {
      fileName: `${id}.pdf`,
      fileSizeBytes: 2048,
      mimeType: "application/pdf",
    },
    id,
    kind: "vehicle_registration",
    metadata: { plate, unitId, vehicleLabel },
    status: "issued",
    title,
    updatedAt: "2026-01-01T11:00:00.000Z",
    uploadedAt: "2026-01-01T11:00:00.000Z",
  };
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
  vehicleDocument(
    "document_civic",
    "Doc Civic",
    "unit_1",
    "ABC1D23",
    "Honda Civic",
  ),
  vehicleDocument(
    "document_corolla",
    "Doc Corolla",
    "unit_2",
    "DEF2E34",
    "Toyota Corolla",
  ),
  // Migrated document with multiple links (one row per link, same id).
  multiLinkDocument("document_multi", "Doc multi", "vehicle_unit", "unit_1"),
  multiLinkDocument("document_multi", "Doc multi", "sale", "sale_9"),
  // Migrated document linked only to non-vehicle targets: duplicates in Geral.
  multiLinkDocument("document_double_general", "Doc duplo", "sale", "sale_8"),
  multiLinkDocument("document_double_general", "Doc duplo", "lead", "lead_8"),
];

function multiLinkDocument(
  id: string,
  title: string,
  targetType: WorkspaceDocument["context"]["targetType"],
  targetId: string,
): WorkspaceDocument {
  return {
    capabilities: {
      canRegenerate: false,
      regenerateBlockReason: "renderer_unavailable",
    },
    context: { linkRole: "primary", targetId, targetType },
    createdAt: "2026-01-01T12:00:00.000Z",
    file: {
      fileName: `${id}.pdf`,
      fileSizeBytes: 1024,
      mimeType: "application/pdf",
    },
    id,
    kind: "other",
    metadata: {},
    status: "issued",
    title,
    updatedAt: "2026-01-01T12:00:00.000Z",
    uploadedAt: "2026-01-01T12:00:00.000Z",
  };
}
