// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceDocument } from "../documents/types";
import {
  buildStoredDocumentsZip,
  downloadStoredDocument,
  triggerBrowserDownload,
} from "./saleFinalizationDownloads";

const mocks = vi.hoisted(() => ({
  downloadDocument: vi.fn(),
  generateAsync: vi.fn<(_options: { type: string }) => Promise<Blob>>(),
  zipFile: vi.fn<(_fileName: string, _blob: Blob) => void>(),
}));

vi.mock("../documents/runtimeApi", () => ({
  createDocumentsApiOptions: vi.fn(async () => ({ fetch: vi.fn() })),
}));

vi.mock("../documents/apiClient", () => ({
  createDocumentsApi: vi.fn(() => ({
    downloadDocument: mocks.downloadDocument,
  })),
}));

vi.mock("jszip", () => ({
  default: class MockZip {
    file(fileName: string, blob: Blob) {
      mocks.zipFile(fileName, blob);
    }

    generateAsync(options: { type: string }) {
      return mocks.generateAsync(options);
    }
  },
}));

describe("sale finalization downloads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.downloadDocument.mockImplementation(async (id: string) => ({
      contentHeaders: { Authorization: "Bearer test" },
      contentUrl: `/documents/${id}/content`,
      downloadUrl: `/documents/${id}/download`,
      fileName: `${id}.pdf`,
    }));
    mocks.generateAsync.mockResolvedValue(
      new Blob(["zip"], { type: "application/zip" }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a blob only after the stored content request succeeds", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("pdf", {
        headers: { "Content-Type": "application/pdf" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await downloadStoredDocument(
      workspaceDocument("document_1"),
    );

    expect(fetchMock).toHaveBeenCalledWith("/documents/document_1/content", {
      headers: { Authorization: "Bearer test" },
    });
    expect(result.fileName).toBe("document_1.pdf");
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it("rejects unavailable stored content instead of creating a substitute", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 503 })),
    );

    await expect(
      downloadStoredDocument(workspaceDocument("document_1")),
    ).rejects.toThrow("document_content_unavailable");
  });

  it("adds only successfully recovered stored documents to a ZIP", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("pdf", { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await buildStoredDocumentsZip(
      [workspaceDocument("document_1"), workspaceDocument("document_2")],
      "documentos.zip",
    );

    expect(mocks.zipFile).toHaveBeenCalledOnce();
    expect(mocks.zipFile.mock.calls[0]?.[0]).toBe("document_1.pdf");
    expect(result).toMatchObject({
      count: 1,
      failedCount: 1,
      fileName: "documentos.zip",
    });
  });

  it("does not create an empty ZIP when no stored file can be recovered", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 404 })),
    );

    await expect(
      buildStoredDocumentsZip(
        [workspaceDocument("document_1")],
        "documentos.zip",
      ),
    ).resolves.toBeNull();
    expect(mocks.generateAsync).not.toHaveBeenCalled();
  });

  it("keeps every stored file when download names collide", async () => {
    mocks.downloadDocument.mockImplementation(async (id: string) => ({
      contentUrl: `/documents/${id}/content`,
      downloadUrl: `/documents/${id}/download`,
      fileName: "contrato.pdf",
    }));
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockImplementation(async () => new Response("pdf", { status: 200 })),
    );

    const result = await buildStoredDocumentsZip(
      [workspaceDocument("document_1"), workspaceDocument("document_2")],
      "documentos.zip",
    );

    expect(mocks.zipFile.mock.calls.map(([fileName]) => fileName)).toEqual([
      "contrato.pdf",
      "contrato (2).pdf",
    ]);
    expect(result).toMatchObject({ count: 2, failedCount: 0 });
  });

  it("starts a browser download with the exact verified blob", () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const createObjectUrl = vi.fn(() => "blob:verified-document");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });

    triggerBrowserDownload(blob, "contrato.pdf");

    expect(createObjectUrl).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalledOnce();
  });
});

function workspaceDocument(id: string): WorkspaceDocument {
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
      fileName: `${id}.pdf`,
      fileSizeBytes: 1024,
      mimeType: "application/pdf",
    },
    id,
    kind: "sale_contract",
    metadata: { saleId: "sale_1" },
    status: "issued",
    title: "Contrato",
    updatedAt: "2026-01-01T10:00:00.000Z",
    uploadedAt: "2026-01-01T10:00:00.000Z",
  };
}
