import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestDocumentRepository } from "../../testSupportDocumentRepository.js";
import { updateDocumentMetadata } from "./updateDocumentMetadata.js";

describe("document link operations", () => {
  it("updates scoped document links with target validation and audit", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const linkTargetValidator = { existsInScope: vi.fn(async () => true) };

    const updated = await updateDocumentMetadata(
      createContext({ audit }),
      {
        documentId: document.id,
        linkRole: "primary",
        targetId: "unit_1",
        targetType: "vehicle_unit",
      },
      { documentRepository: repository, linkTargetValidator },
    );

    expect(updated.linkRole).toBe("primary");
    expect(updated.targetId).toBe("unit_1");
    expect(updated.targetType).toBe("vehicle_unit");
    expect(linkTargetValidator.existsInScope).toHaveBeenCalledWith({
      storeId: "store_1",
      targetId: "unit_1",
      targetType: "vehicle_unit",
      tenantId: "tenant_1",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "documents.link.update" }),
    );
  });

  it("rejects document links outside the current store scope", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);

    await expect(
      updateDocumentMetadata(
        createContext(),
        {
          documentId: document.id,
          targetId: "unit_other",
          targetType: "vehicle_unit",
        },
        {
          documentRepository: repository,
          linkTargetValidator: { existsInScope: vi.fn(async () => false) },
        },
      ),
    ).rejects.toThrow(
      "Document link target was not found in the current store.",
    );
  });

  it("updates links to shared sale targets through the same validator", async () => {
    const repository = createTestDocumentRepository();
    const document = await seedDocument(repository);
    const linkTargetValidator = { existsInScope: vi.fn(async () => true) };

    const updated = await updateDocumentMetadata(
      createContext(),
      {
        documentId: document.id,
        targetId: "sale_2",
        targetType: "sale",
      },
      { documentRepository: repository, linkTargetValidator },
    );

    expect(updated.targetId).toBe("sale_2");
    expect(updated.targetType).toBe("sale");
    expect(linkTargetValidator.existsInScope).toHaveBeenCalledWith({
      storeId: "store_1",
      targetId: "sale_2",
      targetType: "sale",
      tenantId: "tenant_1",
    });
  });
});

function createContext(
  options: { audit?: { record: (event: unknown) => Promise<void> } } = {},
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: options.audit ?? { record: vi.fn(async () => undefined) },
    permissions: ["documents.read", "documents.update_links"],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
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
    metadata: { buyer: { name: "Ana Cliente" } },
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
