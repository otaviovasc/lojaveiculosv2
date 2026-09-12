import { describe, expect, it, vi } from "vitest";
import { createTestDocumentRepository } from "../../testSupportDocumentRepository.js";
import {
  createDocumentOperationTestContext as createContext,
  createDocumentOperationTestStorage as createTestObjectStorage,
  seedDocumentOperationTestDocument as seedDocument,
} from "../../testSupportDocumentOperations.js";
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

  it("regenerates the branded workflow PDF for react-pdf documents", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository, {
      renderer: "react-pdf",
    });
    const objectStorage = createTestObjectStorage();

    const regenerated = await regenerateDocument(
      createContext(),
      { documentId: document.id },
      { documentRepository: repository, objectStorage },
    );

    expect(regenerated.status).toBe("issued");
    expect(objectStorage.putObject).toHaveBeenCalledOnce();
    const upload = vi.mocked(objectStorage.putObject).mock.calls[0]?.[0];
    expect(
      Buffer.from((upload?.body as Uint8Array).subarray(0, 4)).toString("utf8"),
    ).toBe("%PDF");
    await expect(
      repository.listVersions({
        documentId: document.id,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toHaveLength(2);
  });

  it("refuses to regenerate a document from an unknown renderer", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository, {
      renderer: "legacy-unknown-renderer",
    });
    const objectStorage = createTestObjectStorage();

    await expect(
      regenerateDocument(
        createContext(),
        { documentId: document.id },
        { documentRepository: repository, objectStorage },
      ),
    ).rejects.toThrow(
      "Document regeneration is unavailable for its original renderer.",
    );

    expect(objectStorage.putObject).not.toHaveBeenCalled();
    await expect(
      repository.listVersions({
        documentId: document.id,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).resolves.toHaveLength(1);
  });
});
