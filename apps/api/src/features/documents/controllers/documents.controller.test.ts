import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { LinkedDocument } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentServices } from "./documentServices.js";
import { createDocumentsFeature } from "./documents.controller.js";

describe("documents controller", () => {
  it("routes workspace filters to the documents service", async () => {
    const services = createDocumentServiceStubs({
      listWorkspace: vi.fn(async (): Promise<readonly LinkedDocument[]> => [
        {
          createdAt: new Date("2026-01-01T10:00:00.000Z"),
          fileName: "contract.pdf",
          fileSizeBytes: 1024,
          id: "document_1",
          kind: "sale_contract",
          linkRole: "primary",
          metadata: { origin: "sale" },
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
        },
      ]),
    });
    const app = createDocumentsTestApp(services);

    const response = await app.request(
      "/api/v1/documents?search=contrato&kind=sale_contract&status=issued",
    );

    expect(response.status).toBe(200);
    expect(services.listWorkspace).toHaveBeenCalledWith(expect.any(Object), {
      kind: "sale_contract",
      search: "contrato",
      status: "issued",
    });
    expect(await response.json()).toEqual({
      documents: [
        {
          capabilities: {
            canRegenerate: false,
            regenerateBlockReason: "renderer_unavailable",
          },
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
          metadata: { origin: "sale" },
          status: "issued",
          title: "Contrato de venda",
          updatedAt: "2026-01-01T10:00:00.000Z",
          uploadedAt: "2026-01-01T10:00:00.000Z",
        },
      ],
    });
  });

  it("rejects invalid query filters before calling the service", async () => {
    const services = createDocumentServiceStubs({
      listWorkspace: vi.fn(async () => []),
    });
    const app = createDocumentsTestApp(services);

    const response = await app.request("/api/v1/documents?status=unknown");

    expect(response.status).toBe(400);
    expect(services.listWorkspace).not.toHaveBeenCalled();
  });
});

function createDocumentServiceStubs(
  overrides: Partial<DocumentServices> = {},
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
    regenerate: vi.fn(async () => unexpected("regenerate")),
    requestUpload: vi.fn(async () => unexpected("requestUpload")),
    suggestTemplateEdit: vi.fn(async () => unexpected("suggestTemplateEdit")),
    updateDocument: vi.fn(async () => unexpected("updateDocument")),
    updateTemplate: vi.fn(async () => {
      throw new Error("Unexpected template update");
    }),
    void: vi.fn(async () => unexpected("void")),
    ...overrides,
  };
}

function createDocumentsTestApp(services: DocumentServices) {
  const app = new Hono();
  app.route(
    "/api/v1/documents",
    createDocumentsFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          permissions: [
            "documents.download",
            "documents.preview",
            "documents.read",
            "documents.regenerate",
            "documents.template_update",
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
