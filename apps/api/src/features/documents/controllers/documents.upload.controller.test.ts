import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { LinkedDocument } from "../../../domains/documents/ports/documentRepository.js";
import { createDocumentsFeature } from "./documents.controller.js";
import type { DocumentServices } from "./documentServices.js";

describe("documents upload controller", () => {
  it("routes upload, create, edit, and delete parity actions", async () => {
    const services = createServices({
      createUploaded: vi.fn(async () => document),
      requestUpload: vi.fn(async () => ({
        expiresAt: new Date("2026-01-01T10:15:00.000Z"),
        publicUrl: "https://cdn.local/document.pdf",
        storageKey:
          "tenants/tenant_1/stores/store_1/documents/store/store_1/document.pdf",
        uploadHeaders: { "content-type": "application/pdf" },
        uploadMethod: "PUT" as const,
        uploadUrl: "https://upload.local/document.pdf",
      })),
      updateDocument: vi.fn(async () => ({
        ...document,
        kind: "other" as const,
        title: "Documento atualizado",
      })),
      void: vi.fn(async () => ({ ...document, status: "voided" as const })),
    });
    const app = createApp(services);

    const upload = await app.request("/api/v1/documents/uploads", {
      body: JSON.stringify({
        contentType: "application/pdf",
        fileName: "document.pdf",
        sizeBytes: 2048,
      }),
      method: "POST",
    });
    const created = await app.request("/api/v1/documents", {
      body: JSON.stringify({
        fileName: "document.pdf",
        fileSizeBytes: 2048,
        kind: "other",
        mimeType: "application/pdf",
        storageKey:
          "tenants/tenant_1/stores/store_1/documents/store/store_1/document.pdf",
        title: "Documento externo",
      }),
      method: "POST",
    });
    const updated = await app.request("/api/v1/documents/document_1", {
      body: JSON.stringify({ kind: "other", title: "Documento atualizado" }),
      method: "PATCH",
    });
    const deleted = await app.request("/api/v1/documents/document_1", {
      method: "DELETE",
    });

    expect(upload.status).toBe(201);
    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(deleted.status).toBe(200);
    expect(services.requestUpload).toHaveBeenCalledWith(expect.any(Object), {
      contentType: "application/pdf",
      fileName: "document.pdf",
      sizeBytes: 2048,
    });
    expect(services.createUploaded).toHaveBeenCalledWith(expect.any(Object), {
      fileName: "document.pdf",
      fileSizeBytes: 2048,
      kind: "other",
      mimeType: "application/pdf",
      storageKey:
        "tenants/tenant_1/stores/store_1/documents/store/store_1/document.pdf",
      title: "Documento externo",
    });
    expect(services.updateDocument).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
      kind: "other",
      title: "Documento atualizado",
    });
    expect(services.void).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
      reason: "Documento excluido pelo operador.",
    });
  });
});

function createServices(
  overrides: Partial<DocumentServices>,
): DocumentServices {
  return {
    createUploaded: vi.fn(async () => unexpected("createUploaded")),
    download: vi.fn(async () => unexpected("download")),
    listVersions: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
    listWorkspace: vi.fn(async () => []),
    preview: vi.fn(async () => unexpected("preview")),
    recordTemplateSuggestionOutcome: vi.fn(async () => ({
      recordedAt: new Date(),
    })),
    regenerate: vi.fn(async () => document),
    requestUpload: vi.fn(async () => unexpected("requestUpload")),
    suggestTemplateEdit: vi.fn(async () => unexpected("suggestTemplateEdit")),
    updateDocument: vi.fn(async () => unexpected("updateDocument")),
    updateTemplate: vi.fn(async () => unexpected("updateTemplate")),
    void: vi.fn(async () => document),
    ...overrides,
  };
}

function createApp(services: DocumentServices) {
  const app = new Hono();
  app.route(
    "/api/v1/documents",
    createDocumentsFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          permissions: [
            "documents.update_metadata",
            "documents.upload",
            "documents.void",
          ],
          request: { requestId: "req_1" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
      services,
    }),
  );
  return app;
}

function unexpected(operation: string): never {
  throw new Error(`Unexpected ${operation}`);
}

const document: LinkedDocument = {
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  fileName: "contract.pdf",
  fileSizeBytes: 1024,
  id: "document_1",
  kind: "sale_contract",
  linkRole: "primary",
  metadata: {},
  mimeType: "application/pdf",
  status: "issued",
  storageKey: "private/storage/key.pdf",
  storeId: "store_1",
  targetId: "sale_1",
  targetType: "sale",
  tenantId: "tenant_1",
  title: "Contrato de venda",
  updatedAt: new Date("2026-01-01T10:00:00.000Z"),
  uploadedAt: new Date("2026-01-01T10:00:00.000Z"),
};
