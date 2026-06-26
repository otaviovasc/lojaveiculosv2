import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CreateObjectDownloadInput,
  CreateObjectUploadInput,
  ObjectStorage,
  PutStorageObjectInput,
} from "../../../../shared/storage/objectStorage.js";
import { createTestDocumentRepository } from "../../testSupportDocumentRepository.js";
import { createUploadedDocument } from "./createUploadedDocument.js";
import { requestDocumentUpload } from "./requestDocumentUpload.js";
import { updateDocumentMetadata } from "./updateDocumentMetadata.js";

describe("document upload operations", () => {
  it("requests upload, registers uploaded documents, and edits metadata", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createTestDocumentRepository();
    const objectStorage = createTestObjectStorage();
    const context = createContext({ audit });

    const upload = await requestDocumentUpload(
      context,
      {
        contentType: "application/pdf",
        fileName: "manual.pdf",
        sizeBytes: 2048,
      },
      { documentRepository: repository, objectStorage },
    );
    const document = await createUploadedDocument(
      context,
      {
        fileName: "manual.pdf",
        fileSizeBytes: 2048,
        kind: "other",
        mimeType: "application/pdf",
        storageKey: upload.storageKey,
        title: "Documento manual",
      },
      { documentRepository: repository, objectStorage },
    );
    const updated = await updateDocumentMetadata(
      context,
      {
        documentId: document.id,
        kind: "internal",
        title: "Documento interno",
      },
      { documentRepository: repository },
    );

    expect(upload.storageKey).toContain(
      "tenants/tenant_1/stores/store_1/documents/store/store_1",
    );
    expect(document.status).toBe("issued");
    expect(document.targetType).toBe("store");
    expect(updated.title).toBe("Documento interno");
    expect(updated.kind).toBe("internal");
    expect(updated.metadata.operationHistory).toHaveLength(2);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.upload.request" }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.upload.register" }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.metadata.update" }),
    );
  });

  it("rejects uploaded document registration outside the scoped storage prefix", async () => {
    const repository = createTestDocumentRepository();

    await expect(
      createUploadedDocument(
        createContext(),
        {
          fileName: "manual.pdf",
          fileSizeBytes: 2048,
          kind: "other",
          mimeType: "application/pdf",
          storageKey:
            "tenants/other/stores/store_1/documents/store/store_1/manual.pdf",
          title: "Documento manual",
        },
        { documentRepository: repository },
      ),
    ).rejects.toThrow("Document storage key is outside the requested scope.");
  });

  it("requests and registers uploads for shared sale targets", async () => {
    const repository = createTestDocumentRepository();
    const objectStorage = createTestObjectStorage();
    const linkTargetValidator = { existsInScope: vi.fn(async () => true) };

    const upload = await requestDocumentUpload(
      createContext(),
      {
        contentType: "application/pdf",
        fileName: "sale.pdf",
        sizeBytes: 2048,
        targetId: "sale_1",
        targetType: "sale",
      },
      { documentRepository: repository, linkTargetValidator, objectStorage },
    );
    const document = await createUploadedDocument(
      createContext(),
      {
        fileName: "sale.pdf",
        fileSizeBytes: 2048,
        kind: "sale_contract",
        mimeType: "application/pdf",
        storageKey: upload.storageKey,
        targetId: "sale_1",
        targetType: "sale",
        title: "Contrato",
      },
      { documentRepository: repository, linkTargetValidator, objectStorage },
    );

    expect(upload.storageKey).toContain(
      "tenants/tenant_1/stores/store_1/documents/sale/sale_1",
    );
    expect(document.targetId).toBe("sale_1");
    expect(document.targetType).toBe("sale");
    expect(linkTargetValidator.existsInScope).toHaveBeenCalledWith({
      storeId: "store_1",
      targetId: "sale_1",
      targetType: "sale",
      tenantId: "tenant_1",
    });
  });
});

function createContext(
  options: {
    audit?: { record: (event: unknown) => Promise<void> };
    permissions?: string[];
  } = {},
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: options.audit ?? { record: vi.fn(async () => undefined) },
    permissions: options.permissions ?? [
      "documents.read",
      "documents.update_metadata",
      "documents.upload",
    ],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createTestObjectStorage(): ObjectStorage {
  return {
    createUpload: vi.fn(async (input: CreateObjectUploadInput) => {
      const storageKey = [...input.scopeSegments, input.fileName].join("/");
      return {
        expiresAt: new Date("2026-01-01T00:15:00.000Z"),
        publicUrl: `https://cdn.local/${storageKey}`,
        storageKey,
        uploadHeaders: { "content-type": input.contentType },
        uploadMethod: "PUT" as const,
        uploadUrl: `https://upload.local/${storageKey}`,
      };
    }),
    createDownload: vi.fn(async (input: CreateObjectDownloadInput) => ({
      downloadMethod: "GET" as const,
      downloadUrl: `https://download.local/${input.storageKey}`,
      expiresAt: new Date("2026-01-01T00:05:00.000Z"),
    })),
    getPublicUrl: (storageKey) => `https://cdn.local/${storageKey}`,
    putObject: vi.fn(async (input: PutStorageObjectInput) => ({
      publicUrl: `https://cdn.local/${input.fileName}`,
      storageKey: input.fileName,
    })),
  };
}
