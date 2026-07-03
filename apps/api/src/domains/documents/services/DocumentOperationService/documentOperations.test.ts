import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type {
  CreateObjectUploadInput,
  CreateObjectDownloadInput,
  PutStorageObjectInput,
} from "../../../../shared/storage/objectStorage.js";
import { createTestDocumentRepository } from "../../testSupportDocumentRepository.js";
import { downloadDocument } from "./downloadDocument.js";
import { previewDocument } from "./previewDocument.js";
import { regenerateDocument } from "./regenerateDocument.js";
import { voidDocument } from "./voidDocument.js";

describe("document operations", () => {
  it("previews document metadata with audit", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);

    const preview = await previewDocument(
      createContext({ audit }),
      { documentId: document.id },
      { documentRepository: repository },
    );

    expect(preview.document.id).toBe(document.id);
    expect(preview.sections.map((section) => section.heading)).toContain(
      "Cláusulas",
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.preview" }),
    );
  });

  it("regenerates and voids scoped documents", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const context = createContext();
    const objectStorage = createTestObjectStorage();

    const regenerated = await regenerateDocument(
      context,
      { documentId: document.id },
      { documentRepository: repository, objectStorage },
    );
    expect(regenerated.status).toBe("issued");
    const voided = await voidDocument(
      context,
      { documentId: document.id, reason: "Cliente desistiu" },
      { documentRepository: repository },
    );

    expect(voided.status).toBe("voided");
    expect(voided.metadata.operationHistory).toHaveLength(2);
  });

  it("creates a scoped download descriptor", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);

    const download = await downloadDocument(
      createContext(),
      { documentId: document.id },
      {
        documentRepository: repository,
        objectStorage: createTestObjectStorage(),
      },
    );

    expect(download.fileName).toBe("contract.pdf");
    expect(download.downloadMethod).toBe("GET");
    expect(download.downloadUrl).toContain("generated/contract.pdf");
    expect(download.versionNumber).toBe(1);
  });

  it("does not sign downloads without download permission", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = createTestObjectStorage();

    await expect(
      downloadDocument(
        createContext({ permissions: ["documents.read"] }),
        { documentId: document.id },
        { documentRepository: repository, objectStorage },
      ),
    ).rejects.toThrow();
    expect(objectStorage.createDownload).not.toHaveBeenCalled();
  });

  it("does not sign documents outside the current store scope", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = createTestObjectStorage();

    await expect(
      downloadDocument(
        createContext({ storeId: "store_other" }),
        { documentId: document.id },
        { documentRepository: repository, objectStorage },
      ),
    ).rejects.toThrow(`Document not found: ${document.id}`);
    expect(objectStorage.createDownload).not.toHaveBeenCalled();
  });

  it("propagates signer failures before writing success audit", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = {
      ...createTestObjectStorage(),
      createDownload: vi.fn(async () => {
        throw new Error("Signer unavailable");
      }),
    };

    await expect(
      downloadDocument(
        createContext({ audit }),
        { documentId: document.id },
        { documentRepository: repository, objectStorage },
      ),
    ).rejects.toThrow("Signer unavailable");
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("keeps immutable versions when regenerating", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const objectStorage = createTestObjectStorage();

    const before = await repository.listVersions({
      documentId: document.id,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    await regenerateDocument(
      createContext(),
      { documentId: document.id },
      { documentRepository: repository, objectStorage },
    );
    const after = await repository.listVersions({
      documentId: document.id,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    const oldDownload = await downloadDocument(
      createContext(),
      { documentId: document.id, versionId: before[0]?.id },
      { documentRepository: repository, objectStorage },
    );

    expect(after).toHaveLength(2);
    expect(after.map((version) => version.versionNumber)).toEqual([2, 1]);
    expect(after[0]?.storageKey).toContain("regenerated/");
    expect(after[1]?.storageKey).toBe("generated/contract.pdf");
    expect(oldDownload.downloadUrl).toContain("generated/contract.pdf");
  });
});

function createContext(
  options: {
    audit?: { record: (event: unknown) => Promise<void> };
    permissions?: string[];
    storeId?: string;
  } = {},
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: options.audit ?? { record: vi.fn(async () => undefined) },
    permissions: options.permissions ?? [
      "documents.preview",
      "documents.download",
      "documents.read",
      "documents.regenerate",
      "documents.void",
    ],
    request: { requestId: "req_1" },
    storeId: options.storeId ?? "store_1",
    tenantId: "tenant_1",
  });
}

function createTestObjectStorage(): ObjectStorage {
  let putCount = 0;
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
    putObject: vi.fn(async (input: PutStorageObjectInput) => {
      putCount += 1;
      return {
        publicUrl: `https://cdn.local/regenerated/${putCount}-${input.fileName}`,
        storageKey: `regenerated/${putCount}-${input.fileName}`,
      };
    }),
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
    metadata: {
      buyer: { name: "Ana Cliente" },
      templateClauses: ["Contrato de {{buyer.name}}"],
      templateTitle: "Contrato customizado",
    },
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
