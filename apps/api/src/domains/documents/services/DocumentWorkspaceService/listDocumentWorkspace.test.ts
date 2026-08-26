import { describe, expect, it, vi } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestDocumentRepository } from "../../testSupportDocumentRepository.js";
import { listDocumentWorkspace } from "./listDocumentWorkspace.js";

describe("listDocumentWorkspace", () => {
  it("lists scoped shared documents with filters and audit", async () => {
    const repository = createTestDocumentRepository();
    await repository.create({
      createdByUserId: "11111111-1111-4111-8111-111111111111",
      fileName: "contract.pdf",
      fileSizeBytes: 1024,
      kind: "sale_contract",
      linkRole: "primary",
      mimeType: "application/pdf",
      status: "issued",
      storageKey: "tenants/tenant_1/stores/store_1/sales/sale_1/contract.pdf",
      storeId: "store_1",
      targetId: "sale_1",
      targetType: "sale",
      tenantId: "tenant_1",
      title: "Contrato de venda",
    });
    await repository.create({
      createdByUserId: null,
      fileName: "internal.pdf",
      fileSizeBytes: 512,
      kind: "internal",
      linkRole: "primary",
      mimeType: "application/pdf",
      status: "draft",
      storageKey: "tenants/tenant_1/stores/store_1/internal.pdf",
      storeId: "store_1",
      targetId: "store_1",
      targetType: "store",
      tenantId: "tenant_1",
      title: "Nota interna",
    });
    const audit = createMemoryAuditSink();
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit,
      entitlements: ["documents"],
      logger,
      permissions: ["documents.read"],
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    const page = await listDocumentWorkspace(
      context,
      { limit: 25, offset: 0, search: "contrato", status: "issued" },
      { documentRepository: repository },
    );

    expect(page).toMatchObject({ limit: 25, offset: 0, total: 1 });
    expect(page.documents).toHaveLength(1);
    expect(page.documents[0]?.title).toBe("Contrato de venda");
    expect(logger.info).toHaveBeenCalledWith(
      "documents.workspace.list",
      expect.objectContaining({ documentCount: 1, requestId: "req_1" }),
    );
    const event = audit.events[0];
    expect(event?.action).toBe("documents.workspace.list");
    expect(event?.category).toBe("data_access");
    expect(event?.metadata?.documentCount).toBe(1);
    expect(event?.metadata?.totalDocumentCount).toBe(1);
    expect(event?.requestId).toBe("req_1");
    expect(event?.storeId).toBe("store_1");
    expect(event?.tenantId).toBe("tenant_1");
  });

  it("returns truthful totals and the requested page", async () => {
    const repository = createTestDocumentRepository();
    for (let index = 0; index < 5; index += 1) {
      await repository.create({
        createdByUserId: null,
        fileName: `document-${index}.pdf`,
        fileSizeBytes: 100,
        kind: "other",
        linkRole: "primary",
        mimeType: "application/pdf",
        status: "issued",
        storageKey: `documents/document-${index}.pdf`,
        storeId: "store_1",
        targetId: "store_1",
        targetType: "store",
        tenantId: "tenant_1",
        title: `Documento ${index}`,
      });
    }
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      entitlements: ["documents"],
      permissions: ["documents.read"],
      request: { requestId: "req_page" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    const page = await listDocumentWorkspace(
      context,
      { limit: 2, offset: 2 },
      { documentRepository: repository },
    );

    expect(page).toMatchObject({ limit: 2, offset: 2, total: 5 });
    expect(page.documents).toHaveLength(2);
  });

  it("counts one workspace document when it has multiple target links", async () => {
    const repository = createTestDocumentRepository();
    const document = await repository.create({
      createdByUserId: null,
      fileName: "sale.pdf",
      fileSizeBytes: 100,
      kind: "sale_contract",
      linkRole: "primary",
      mimeType: "application/pdf",
      status: "issued",
      storageKey: "documents/sale.pdf",
      storeId: "store_1",
      targetId: "sale_1",
      targetType: "sale",
      tenantId: "tenant_1",
      title: "Contrato de venda",
    });
    repository.documents.push({
      ...document,
      linkRole: "related_vehicle",
      targetId: "unit_1",
      targetType: "vehicle_unit",
    });
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      entitlements: ["documents"],
      permissions: ["documents.read"],
      request: { requestId: "req_multiple_links" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    const workspace = await listDocumentWorkspace(
      context,
      {},
      { documentRepository: repository },
    );
    const vehicleDocuments = await listDocumentWorkspace(
      context,
      { targetType: "vehicle_unit" },
      { documentRepository: repository },
    );

    expect(workspace.total).toBe(1);
    expect(workspace.documents).toHaveLength(1);
    expect(vehicleDocuments).toMatchObject({
      documents: [expect.objectContaining({ targetId: "unit_1" })],
      total: 1,
    });
  });

  it("applies origin, date, metadata search, and folder scope before paging", async () => {
    const repository = createTestDocumentRepository();
    const older = await repository.create({
      createdByUserId: null,
      fileName: "vistoria.pdf",
      fileSizeBytes: 100,
      kind: "inspection",
      linkRole: "primary",
      metadata: { manualUpload: true, plate: "ABC1D23" },
      mimeType: "application/pdf",
      status: "draft",
      storageKey: "documents/vistoria.pdf",
      storeId: "store_1",
      targetId: "unit_1",
      targetType: "vehicle_unit",
      tenantId: "tenant_1",
      title: "Vistoria arquivada",
    });
    older.uploadedAt = new Date("2026-01-15T12:00:00.000Z");
    await repository.create({
      createdByUserId: null,
      fileName: "recent.pdf",
      fileSizeBytes: 100,
      kind: "other",
      linkRole: "primary",
      mimeType: "application/pdf",
      status: "issued",
      storageKey: "documents/recent.pdf",
      storeId: "store_1",
      targetId: "store_1",
      targetType: "store",
      tenantId: "tenant_1",
      title: "Documento recente",
    });
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      entitlements: ["documents"],
      permissions: ["documents.read"],
      request: { requestId: "req_server_filters" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    const page = await listDocumentWorkspace(
      context,
      {
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
        kind: "inspection",
        origin: "manual",
        scope: "vehicle",
        search: "abc1d23",
        status: "draft",
      },
      { documentRepository: repository },
    );

    expect(page.total).toBe(1);
    expect(page.documents).toEqual([
      expect.objectContaining({ id: older.id, targetId: "unit_1" }),
    ]);
  });
});
