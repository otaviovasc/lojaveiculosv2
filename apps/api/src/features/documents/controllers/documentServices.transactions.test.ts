import { describe, expect, it, vi } from "vitest";
import type { DocumentWorkspaceServicePorts } from "../../../domains/documents/services/DocumentWorkspaceService/serviceSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import { createMemoryDocumentRepository } from "../adapters/memoryDocumentRepository.js";
import { createDocumentServices } from "./documentServices.js";

describe("document transaction composition", () => {
  const cases: readonly [
    string,
    (services: ReturnType<typeof createDocumentServices>) => Promise<unknown>,
  ][] = [
    [
      "createUploaded",
      (services) =>
        services.createUploaded(context(), {
          fileName: "doc.pdf",
          fileSizeBytes: 100,
          kind: "sale_contract",
          mimeType: "application/pdf",
          storageKey:
            "tenants/tenant_1/stores/store_1/documents/document_1/doc.pdf",
          title: "Doc",
        }),
    ],
    [
      "updateDocument",
      (services) =>
        services.updateDocument(context(), {
          documentId: "document_1",
          title: "Updated",
        }),
    ],
    [
      "updateTemplate",
      (services) =>
        services.updateTemplate(context(), {
          clauses: ["Clause"],
          kind: "sale_contract",
          title: "Contract",
        }),
    ],
    [
      "void",
      (services) => services.void(context(), { documentId: "document_1" }),
    ],
  ];

  it.each(cases)("%s runs inside the transaction runner", async (_, call) => {
    const error = new Error("transaction required");
    const runner: TransactionRunner<DocumentWorkspaceServicePorts> = {
      runInTransaction: vi.fn(async () => {
        throw error;
      }),
    };
    const services = createDocumentServices({
      ports: {
        documentRepository: createMemoryDocumentRepository(),
        objectStorage: createMemoryObjectStorage(),
      },
      transactionRunner: runner,
    });

    await expect(call(services)).rejects.toThrow(error);
    expect(runner.runInTransaction).toHaveBeenCalledTimes(1);
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: [
      "documents.regenerate",
      "documents.template_update",
      "documents.update_metadata",
      "documents.upload",
      "documents.void",
    ],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
