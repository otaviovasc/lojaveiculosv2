import { describe, expect, it, vi } from "vitest";
import { createDocumentsApi } from "./apiClient";

describe("documents upload api client", () => {
  it("runs upload, create, edit, and delete document operations", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            expiresAt: "2026-01-01T10:15:00.000Z",
            publicUrl: "https://cdn.local/document.pdf",
            storageKey:
              "tenants/tenant_1/stores/store_1/documents/store/store_1/document.pdf",
            uploadHeaders: { "content-type": "application/pdf" },
            uploadMethod: "PUT",
            uploadUrl: "https://upload.local/document.pdf",
          },
          201,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(documentBody(), 201))
      .mockResolvedValueOnce(
        jsonResponse(
          documentBody({ kind: "other", title: "Documento editado" }),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(documentBody({ status: "voided" })));
    const api = createDocumentsApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja" },
      fetch: fetchMock,
    });

    const upload = await api.requestDocumentUpload({
      contentType: "application/pdf",
      fileName: "document.pdf",
      sizeBytes: 2048,
    });
    const created = await api.createUploadedDocument({
      fileName: "document.pdf",
      fileSizeBytes: 2048,
      kind: "other",
      mimeType: "application/pdf",
      storageKey: upload.storageKey,
      title: "Documento externo",
    });
    const updated = await api.updateDocument("document_1", {
      kind: "other",
      title: "Documento editado",
    });
    const deleted = await api.deleteDocument("document_1");

    expect(created.id).toBe("document_1");
    expect(updated.title).toBe("Documento editado");
    expect(deleted.status).toBe("voided");
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "/api/v1/documents/uploads",
      "/api/v1/documents",
      "/api/v1/documents/document_1",
      "/api/v1/documents/document_1",
    ]);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "PATCH" });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: "DELETE" });
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}
