import { vi } from "vitest";
import type {
  CreateVehicleDocumentRecord,
  ListVehicleDocumentsInput,
  VehicleDocument,
  VehicleDocumentRepository,
} from "./ports/vehicleInventoryRepository.js";
import { testNow } from "./testSupportVehicleServiceFixtures.js";

export function createTestVehicleDocumentRepository(
  documents: Map<string, VehicleDocument>,
  nextSequence: () => number,
): VehicleDocumentRepository {
  return {
    create: vi.fn(async (record: CreateVehicleDocumentRecord) => {
      const document: VehicleDocument = {
        ...record,
        createdAt: testNow,
        id: `document_${nextSequence()}`,
        metadata: record.metadata ?? {},
        updatedAt: testNow,
        uploadedAt: testNow,
      };
      documents.set(document.id, document);
      return document;
    }),
    listByListing: vi.fn(async (input: ListVehicleDocumentsInput) =>
      [...documents.values()].filter((document) =>
        isScopedDocument(document, input),
      ),
    ),
  };
}

function isScopedDocument(
  document: VehicleDocument,
  input: ListVehicleDocumentsInput,
) {
  return (
    [input.listingId, ...input.unitIds].includes(document.targetId) &&
    document.storeId === input.storeId &&
    document.tenantId === input.tenantId
  );
}
