import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import {
  StorageObjectNotFoundError,
  type ObjectStorage,
} from "../../../../shared/storage/objectStorage.js";
import type {
  CreateObjectDownloadInput,
  CreateObjectUploadInput,
  PutStorageObjectInput,
} from "../../../../shared/storage/objectStorage.js";
import { createTestDocumentRepository } from "../../testSupportDocumentRepository.js";
import { downloadDocument } from "./downloadDocument.js";

describe("download document operation", () => {
  it("downloads the current document file when no stored version exists", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = createTestObjectStorage();

    const download = await downloadDocument(
      createContext(),
      { documentId: document.id },
      {
        documentRepository: {
          ...repository,
          listVersions: vi.fn(async () => []),
        },
        objectStorage,
      },
    );

    expect(download.fileName).toBe("contract.pdf");
    expect(download.downloadUrl).toContain("generated/contract.pdf");
    expect(download.versionId).toBe(document.id);
    expect(download.versionNumber).toBe(1);
    expect(objectStorage.createDownload).toHaveBeenCalledWith(
      expect.objectContaining({ disposition: "attachment" }),
    );
  });

  it("signs inline descriptors for PDF preview", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = createTestObjectStorage();

    const download = await downloadDocument(
      createContext(),
      { disposition: "inline", documentId: document.id },
      { documentRepository: repository, objectStorage },
    );

    expect(download.downloadUrl).toContain("generated/contract.pdf");
    expect(objectStorage.createDownload).toHaveBeenCalledWith(
      expect.objectContaining({ disposition: "inline" }),
    );
  });

  it("does not fall back to the current file for an unknown explicit version", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = createTestObjectStorage();

    await expect(
      downloadDocument(
        createContext(),
        { documentId: document.id, versionId: "missing_version" },
        {
          documentRepository: {
            ...repository,
            listVersions: vi.fn(async () => []),
          },
          objectStorage,
        },
      ),
    ).rejects.toThrow(`Document not found: ${document.id}`);
    expect(objectStorage.createDownload).not.toHaveBeenCalled();
  });

  it("maps missing stored objects to document not found errors", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = {
      ...createTestObjectStorage(),
      createDownload: vi.fn(async () => {
        throw new StorageObjectNotFoundError();
      }),
    };

    await expect(
      downloadDocument(
        createContext({ audit }),
        { documentId: document.id },
        { documentRepository: repository, objectStorage },
      ),
    ).rejects.toThrow(`Document not found: ${document.id}`);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

function createContext(
  options: { audit?: { record: (event: unknown) => Promise<void> } } = {},
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: options.audit ?? { record: vi.fn(async () => undefined) },
    permissions: ["documents.download", "documents.read"],
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

function seedDocument(
  repository: ReturnType<typeof createTestDocumentRepository>,
) {
  return repository.create({
    createdByUserId: null,
    fileName: "contract.pdf",
    fileSizeBytes: null,
    kind: "sale_contract",
    linkRole: "sale_contract",
    metadata: {},
    mimeType: "application/pdf",
    status: "issued",
    storageKey: "generated/contract.pdf",
    storeId: "store_1",
    targetId: "sale_1",
    targetType: "sale",
    tenantId: "tenant_1",
    title: "Contrato customizado",
  });
}
