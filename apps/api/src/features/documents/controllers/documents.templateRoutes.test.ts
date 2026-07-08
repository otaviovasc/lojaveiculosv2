import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { DocumentTemplate } from "../../../domains/documents/ports/documentRepository.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createDocumentsFeature } from "./documents.controller.js";
import type { DocumentServices } from "./documentServices.js";

describe("document template routes", () => {
  it("lists editable and locked document templates", async () => {
    const services = createDocumentServiceStubs({
      listTemplates: vi.fn(async () => [templateFixture()]),
    });
    const app = createDocumentsTestApp(services);

    const response = await app.request("/api/v1/documents/templates");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      templates: [templateResponseFixture()],
    });
  });

  it("updates one editable document template by template key", async () => {
    const updatedAt = new Date("2026-01-02T10:00:00.000Z");
    const services = createDocumentServiceStubs({
      updateTemplate: vi.fn(async () =>
        templateFixture({
          blocks: [block("Termo personalizado")],
          clauses: ["Termo personalizado"],
          defaultBlocks: [block("Termo padrao")],
          defaultClauses: ["Termo padrao"],
          defaultTitle: "Recibo de reserva",
          isCustomized: true,
          kind: "reservation_receipt",
          templateKey: "reservation_receipt",
          title: "Reserva personalizada",
          updatedAt,
        }),
      ),
    });
    const app = createDocumentsTestApp(services);

    const response = await app.request(
      "/api/v1/documents/templates/reservation_receipt",
      {
        body: JSON.stringify({
          clauses: ["Termo personalizado"],
          title: "Reserva personalizada",
        }),
        method: "PUT",
      },
    );

    expect(response.status).toBe(200);
    expect(services.updateTemplate).toHaveBeenCalledWith(expect.any(Object), {
      blocks: undefined,
      clauses: ["Termo personalizado"],
      templateKey: "reservation_receipt",
      title: "Reserva personalizada",
    });
    expect(await response.json()).toEqual(
      templateResponseFixture({
        blocks: [block("Termo personalizado")],
        clauses: ["Termo personalizado"],
        defaultBlocks: [block("Termo padrao")],
        defaultClauses: ["Termo padrao"],
        defaultTitle: "Recibo de reserva",
        isCustomized: true,
        kind: "reservation_receipt",
        templateKey: "reservation_receipt",
        title: "Reserva personalizada",
        updatedAt: "2026-01-02T10:00:00.000Z",
      }),
    );
  });

  it("records accepted suggestion outcomes without raw document text", async () => {
    const services = createDocumentServiceStubs({
      recordTemplateSuggestionOutcome: vi.fn(async () => ({
        recordedAt: new Date("2026-01-03T10:00:00.000Z"),
      })),
    });
    const app = createDocumentsTestApp(services);

    const response = await app.request(
      "/api/v1/documents/templates/sale_contract/suggestions/outcome",
      {
        body: JSON.stringify({ diffCount: 2, outcome: "accepted" }),
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    expect(services.recordTemplateSuggestionOutcome).toHaveBeenCalledWith(
      expect.any(Object),
      {
        diffCount: 2,
        outcome: "accepted",
        templateKey: "sale_contract",
      },
    );
    expect(await response.json()).toEqual({
      recordedAt: "2026-01-03T10:00:00.000Z",
    });
  });
});

function templateFixture(
  overrides: Partial<DocumentTemplate> = {},
): DocumentTemplate {
  return {
    availableVariables: ["{{buyer.name}}"],
    blocks: [block("Cliente {{buyer.name}}")],
    category: "Legal",
    clauses: ["Cliente {{buyer.name}}"],
    context: "sale",
    defaultBlocks: [block("Cliente {{buyer.name}}")],
    defaultClauses: ["Cliente {{buyer.name}}"],
    defaultTitle: "Contrato de venda",
    description: "Modelo editável",
    isCustomized: false,
    kind: "sale_contract",
    mode: "editable",
    source: "system",
    templateKey: "sale_contract",
    title: "Contrato de venda",
    updatedAt: null,
    ...overrides,
  };
}

function templateResponseFixture(overrides: Record<string, unknown> = {}) {
  return {
    ...templateFixture(),
    updatedAt: null,
    ...overrides,
  };
}

function block(body: string) {
  return { body, id: "clause_1", type: "clause" };
}

function createDocumentServiceStubs(
  overrides: Partial<DocumentServices> = {},
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

function createDocumentsTestApp(services: DocumentServices) {
  const app = new Hono();
  app.route(
    "/api/v1/documents",
    createDocumentsFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          permissions: ["documents.read", "documents.template_update"],
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
