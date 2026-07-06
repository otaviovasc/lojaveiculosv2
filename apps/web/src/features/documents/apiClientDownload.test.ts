import { describe, expect, it, vi } from "vitest";
import { createDocumentsApi } from "./apiClient";

describe("documents api download client", () => {
  it("requests inline PDF descriptors for document previews", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          document: {
            context: {
              linkRole: "primary",
              targetId: "sale_1",
              targetType: "sale",
            },
            createdAt: "2026-01-01T10:00:00.000Z",
            file: {
              fileName: "contract.pdf",
              fileSizeBytes: 1024,
              mimeType: "application/pdf",
            },
            id: "document_1",
            kind: "sale_contract",
            metadata: {},
            status: "issued",
            title: "Contrato",
            updatedAt: "2026-01-01T10:00:00.000Z",
            uploadedAt: "2026-01-01T10:00:00.000Z",
          },
          downloadMethod: "GET",
          downloadUrl: "https://download.local/document.pdf",
          expiresAt: "2026-01-01T10:05:00.000Z",
          fileName: "contract.pdf",
          mimeType: "application/pdf",
          versionId: "version_1",
          versionNumber: 1,
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    const api = createDocumentsApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja" },
      fetch: fetchMock,
    });

    await api.downloadDocument("document_1", { disposition: "inline" });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/documents/document_1/download?disposition=inline",
    );
  });
});
