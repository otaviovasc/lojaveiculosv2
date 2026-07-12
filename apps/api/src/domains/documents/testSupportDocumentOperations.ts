import { vi } from "vitest";
import { createServiceContext } from "../../shared/serviceContext.js";
import type {
  CreateObjectDownloadInput,
  CreateObjectUploadInput,
  ObjectStorage,
  PutStorageObjectInput,
} from "../../shared/storage/objectStorage.js";
import { documentRegenerationRendererKeys } from "./render/documentRegeneration.js";
import type { createTestDocumentRepository } from "./testSupportDocumentRepository.js";

export function createDocumentOperationTestContext(
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

export function createDocumentOperationTestStorage(): ObjectStorage {
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

export function seedDocumentOperationTestDocument(
  repository: ReturnType<typeof createTestDocumentRepository>,
  metadata: Record<string, unknown> = {},
) {
  return repository.create({
    createdByUserId: null,
    fileName: "contract.pdf",
    fileSizeBytes: null,
    kind: "sale_contract",
    linkRole: "sale_contract",
    metadata: {
      buyer: { name: "Ana Cliente" },
      renderer: documentRegenerationRendererKeys.metadataSummary,
      templateClauses: ["Contrato de {{buyer.name}}"],
      templateTitle: "Contrato customizado",
      ...metadata,
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
