import { createTestDocumentRepository } from "../../../domains/documents/testSupportDocumentRepository.js";

export function createMemoryDocumentRepository() {
  return createTestDocumentRepository();
}
