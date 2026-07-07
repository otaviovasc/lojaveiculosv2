import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { DocumentVersion } from "../../../domains/documents/ports/documentRepository.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createDocumentsFeature } from "./documents.controller.js";
import type { DocumentServices } from "./documentServices.js";

describe("documents versions controller", () => {
  it("lists immutable document versions", async () => {
    const services = createServices({
      listVersions: vi.fn(async (): Promise<readonly DocumentVersion[]> => [
        {
          createdAt: new Date("2026-01-02T10:00:00.000Z"),
          createdByUserId: "user_1",
          documentId: "document_1",
          fileName: "contract-v2.pdf",
          fileSizeBytes: 2048,
          id: "version_2",
          metadata: { operation: "regenerate" },
          mimeType: "application/pdf",
          storageKey: "private/contract-v2.pdf",
          storeId: "store_1",
          tenantId: "tenant_1",
          versionNumber: 2,
        },
      ]),
    });

    const response = await createApp(services).request(
      "/api/v1/documents/document_1/versions",
    );

    expect(response.status).toBe(200);
    expect(services.listVersions).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
    });
    expect(await response.json()).toEqual({
      versions: [
        {
          createdAt: "2026-01-02T10:00:00.000Z",
          file: {
            fileName: "contract-v2.pdf",
            fileSizeBytes: 2048,
            mimeType: "application/pdf",
          },
          id: "version_2",
          metadata: { operation: "regenerate" },
          versionNumber: 2,
        },
      ],
    });
  });
});

function createServices(
  overrides: Partial<DocumentServices>,
): DocumentServices {
  return {
    createUploaded: vi.fn(async () => unexpected("createUploaded")),
    download: vi.fn(async () => unexpected("download")),
    listTemplates: vi.fn(async () => []),
    listVersions: vi.fn(async () => []),
    listWorkspace: vi.fn(async () => []),
    preview: vi.fn(async () => unexpected("preview")),
    recordTemplateSuggestionOutcome: vi.fn(async () => ({
      recordedAt: new Date(),
    })),
    regenerate: vi.fn(async () => unexpected("regenerate")),
    requestUpload: vi.fn(async () => unexpected("requestUpload")),
    suggestTemplateEdit: vi.fn(async () => unexpected("suggestTemplateEdit")),
    updateDocument: vi.fn(async () => unexpected("updateDocument")),
    updateTemplate: vi.fn(async () => unexpected("updateTemplate")),
    void: vi.fn(async () => unexpected("void")),
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
          permissions: ["documents.read"],
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
