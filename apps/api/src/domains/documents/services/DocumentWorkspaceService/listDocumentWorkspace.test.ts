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
      logger,
      permissions: ["documents.read"],
      request: { requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    const documents = await listDocumentWorkspace(
      context,
      { search: "contrato", status: "issued" },
      { documentRepository: repository },
    );

    expect(documents).toHaveLength(1);
    expect(documents[0]?.title).toBe("Contrato de venda");
    expect(logger.info).toHaveBeenCalledWith(
      "documents.workspace.list",
      expect.objectContaining({ documentCount: 1, requestId: "req_1" }),
    );
    const event = audit.events[0];
    expect(event?.action).toBe("documents.workspace.list");
    expect(event?.category).toBe("data_access");
    expect(event?.metadata?.documentCount).toBe(1);
    expect(event?.requestId).toBe("req_1");
    expect(event?.storeId).toBe("store_1");
    expect(event?.tenantId).toBe("tenant_1");
  });

  it("requires the workspace read permission", async () => {
    const context = createServiceContext({
      request: { requestId: "req_denied" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      listDocumentWorkspace(
        context,
        {},
        {
          documentRepository: createTestDocumentRepository(),
        },
      ),
    ).rejects.toThrow("Missing permission: documents.read");
  });
});
