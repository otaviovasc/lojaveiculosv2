import { describe, expect, it, vi } from "vitest";
import { createDocumentsApi, documentsRoutes } from "./apiClient";

describe("documents api client", () => {
  it("builds documents workspace routes with filters", () => {
    expect(documentsRoutes.documents()).toBe("/api/v1/documents");
    expect(documentsRoutes.templates()).toBe("/api/v1/documents/templates");
    expect(documentsRoutes.template("sale_contract")).toBe(
      "/api/v1/documents/templates/sale_contract",
    );
    expect(documentsRoutes.preview("document 1")).toBe(
      "/api/v1/documents/document%201/preview",
    );
    expect(documentsRoutes.download("document 1")).toBe(
      "/api/v1/documents/document%201/download",
    );
    expect(documentsRoutes.download("document 1", "version 2")).toBe(
      "/api/v1/documents/document%201/download?versionId=version%202",
    );
    expect(documentsRoutes.versions("document 1")).toBe(
      "/api/v1/documents/document%201/versions",
    );
    expect(documentsRoutes.regenerate("document 1")).toBe(
      "/api/v1/documents/document%201/regenerate",
    );
    expect(documentsRoutes.void("document 1")).toBe(
      "/api/v1/documents/document%201/void",
    );
    expect(
      documentsRoutes.documents({
        kind: "sale_contract",
        limit: 150,
        search: "contrato venda",
        status: "issued",
        targetId: "sale_1",
        targetType: "sale",
      }),
    ).toBe(
      "/api/v1/documents?search=contrato+venda&kind=sale_contract&status=issued&targetId=sale_1&targetType=sale&limit=150",
    );
  });

  it("runs document operations with auth headers", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          document: documentBody(),
          generatedAt: "2026-01-01T10:00:00.000Z",
          sections: [{ heading: "Documento", lines: ["Contrato"] }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          document: documentBody(),
          downloadMethod: "GET",
          downloadUrl: "https://download.local/document.pdf",
          expiresAt: "2026-01-01T10:05:00.000Z",
          fileName: "contract.pdf",
          mimeType: "application/pdf",
          versionId: "version_1",
          versionNumber: 1,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          versions: [
            {
              createdAt: "2026-01-01T10:00:00.000Z",
              file: {
                fileName: "contract.pdf",
                fileSizeBytes: 1024,
                mimeType: "application/pdf",
              },
              id: "version_1",
              metadata: {},
              versionNumber: 1,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(documentBody({ status: "voided" })));
    const api = createDocumentsApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja" },
      fetch: fetchMock,
    });

    const preview = await api.previewDocument("document_1");
    const download = await api.downloadDocument("document_1");
    const versions = await api.listVersions("document_1");
    const voided = await api.voidDocument("document_1", {
      reason: "Cliente desistiu",
    });

    expect(preview.sections).toHaveLength(1);
    expect(download.downloadUrl).toBe("https://download.local/document.pdf");
    expect(download.versionNumber).toBe(1);
    expect(versions[0]?.id).toBe("version_1");
    expect(voided.status).toBe("voided");
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "/api/v1/documents/document_1/void",
    );
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      body: JSON.stringify({ reason: "Cliente desistiu" }),
      method: "POST",
    });
  });

  it("updates document templates with auth headers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        availableVariables: ["{{buyer.name}}"],
        clauses: ["Cliente {{buyer.name}}"],
        defaultClauses: ["Cliente {{buyer.name}}"],
        defaultTitle: "Contrato de venda",
        isCustomized: true,
        kind: "sale_contract",
        title: "Contrato personalizado",
        updatedAt: "2026-01-01T10:00:00.000Z",
      }),
    );
    const api = createDocumentsApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja" },
      fetch: fetchMock,
    });

    const template = await api.updateTemplate("sale_contract", {
      clauses: ["Cliente {{buyer.name}}"],
      title: "Contrato personalizado",
    });

    expect(template.isCustomized).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/documents/templates/sale_contract",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      body: JSON.stringify({
        clauses: ["Cliente {{buyer.name}}"],
        title: "Contrato personalizado",
      }),
      method: "PUT",
    });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
      expect.objectContaining({
        "x-clerk-user-id": "clerk_1",
        "x-store-slug": "loja",
      }),
    );
  });

  it("lists workspace documents with auth headers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        documents: [
          {
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
        ],
      }),
    );
    const api = createDocumentsApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja" },
      fetch: fetchMock,
    });

    const documents = await api.listDocuments({ targetType: "sale" });

    expect(documents).toHaveLength(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/api/v1/documents?targetType=sale",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
      expect.objectContaining({
        "x-clerk-user-id": "clerk_1",
        "x-store-slug": "loja",
      }),
    );
  });
});

function documentBody(overrides: Record<string, unknown> = {}) {
  return {
    context: { linkRole: "primary", targetId: "sale_1", targetType: "sale" },
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
    ...overrides,
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
