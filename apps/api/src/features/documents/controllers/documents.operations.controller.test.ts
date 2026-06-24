import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { LinkedDocument } from "../../../domains/documents/ports/documentRepository.js";
import type { DocumentPreview } from "../../../domains/documents/preview/documentPreview.js";
import { createDocumentsFeature } from "./documents.controller.js";
import type { DocumentServices } from "./documentServices.js";

describe("documents operation controller", () => {
  it("routes document preview requests", async () => {
    const services = createServices({
      preview: vi.fn(
        async (): Promise<DocumentPreview> => ({
          document,
          generatedAt: new Date("2026-01-02T10:00:00.000Z"),
          sections: [{ heading: "Documento", lines: ["Contrato"] }],
        }),
      ),
    });

    const response = await createApp(services).request(
      "/api/v1/documents/document_1/preview",
    );

    expect(response.status).toBe(200);
    expect(services.preview).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({ generatedAt: "2026-01-02T10:00:00.000Z" }),
    );
  });

  it("routes regenerate and void document actions", async () => {
    const services = createServices({
      regenerate: vi.fn(async () => document),
      void: vi.fn(async () => ({ ...document, status: "voided" as const })),
    });
    const app = createApp(services);

    const regenerate = await app.request(
      "/api/v1/documents/document_1/regenerate",
      { method: "POST" },
    );
    const voided = await app.request("/api/v1/documents/document_1/void", {
      body: JSON.stringify({ reason: "Cliente desistiu" }),
      method: "POST",
    });

    expect(regenerate.status).toBe(200);
    expect(voided.status).toBe(200);
    expect(services.regenerate).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
    });
    expect(services.void).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
      reason: "Cliente desistiu",
    });
  });

  it("routes document download descriptor requests", async () => {
    const services = createServices({
      download: vi.fn(async () => ({
        document,
        downloadMethod: "GET" as const,
        downloadUrl: "https://download.local/document.pdf",
        expiresAt: new Date("2026-01-01T10:05:00.000Z"),
        fileName: "contract.pdf",
        mimeType: "application/pdf",
        versionId: "version_1",
        versionNumber: 1,
      })),
    });

    const response = await createApp(services).request(
      "/api/v1/documents/document_1/download",
    );

    expect(response.status).toBe(200);
    expect(services.download).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({
        downloadUrl: "https://download.local/document.pdf",
        versionNumber: 1,
      }),
    );
  });

  it("routes document link update requests", async () => {
    const services = createServices({
      updateDocument: vi.fn(async () => ({
        ...document,
        linkRole: "primary",
        targetId: "unit_1",
        targetType: "vehicle_unit" as const,
      })),
    });

    const response = await createApp(services).request(
      "/api/v1/documents/document_1",
      {
        body: JSON.stringify({
          linkRole: "primary",
          targetId: "unit_1",
          targetType: "vehicle_unit",
        }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateDocument).toHaveBeenCalledWith(expect.any(Object), {
      documentId: "document_1",
      linkRole: "primary",
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    const payload = (await response.json()) as unknown as {
      context: { targetId: string; targetType: string };
    };
    expect(payload.context).toEqual(
      expect.objectContaining({
        targetId: "unit_1",
        targetType: "vehicle_unit",
      }),
    );
  });
});

function createServices(
  overrides: Partial<DocumentServices>,
): DocumentServices {
  return {
    createUploaded: vi.fn(async () => {
      throw new Error("Unexpected create uploaded");
    }),
    download: vi.fn(async () => {
      throw new Error("Unexpected download");
    }),
    listVersions: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
    listWorkspace: vi.fn(async () => []),
    preview: vi.fn(async () => {
      throw new Error("Unexpected preview");
    }),
    regenerate: vi.fn(async () => document),
    requestUpload: vi.fn(async () => {
      throw new Error("Unexpected request upload");
    }),
    updateDocument: vi.fn(async () => {
      throw new Error("Unexpected document update");
    }),
    updateTemplate: vi.fn(async () => {
      throw new Error("Unexpected template update");
    }),
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
            "documents.preview",
            "documents.download",
            "documents.read",
            "documents.regenerate",
            "documents.update_links",
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
