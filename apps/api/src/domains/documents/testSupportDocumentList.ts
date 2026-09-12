import type {
  LinkedDocument,
  ListDocumentsInput,
  ListDocumentsResult,
} from "./ports/documentRepository.js";

export function listTestDocuments(
  documents: readonly LinkedDocument[],
  input: ListDocumentsInput,
): ListDocumentsResult {
  const search = input.search?.trim().toLowerCase();
  const vehicleDocumentIds = new Set(
    documents
      .filter(
        (document) =>
          document.storeId === input.storeId &&
          document.tenantId === input.tenantId &&
          document.targetType === "vehicle_unit",
      )
      .map((document) => document.id),
  );
  const matches = [
    ...new Map(
      documents
        .filter(
          (document) =>
            document.storeId === input.storeId &&
            document.tenantId === input.tenantId &&
            (!input.kind || document.kind === input.kind) &&
            (!input.status || document.status === input.status) &&
            (!input.origin ||
              (input.origin === "manual") ===
                (document.metadata.manualUpload === true)) &&
            (!input.scope ||
              (input.scope === "vehicle") ===
                vehicleDocumentIds.has(document.id)) &&
            (!input.targetId || document.targetId === input.targetId) &&
            (!input.targetType || document.targetType === input.targetType) &&
            (!search ||
              document.title.toLowerCase().includes(search) ||
              document.fileName.toLowerCase().includes(search) ||
              JSON.stringify(document.metadata)
                .toLowerCase()
                .includes(search)) &&
            (!input.uploadedFrom ||
              document.uploadedAt >= input.uploadedFrom) &&
            (!input.uploadedTo || document.uploadedAt <= input.uploadedTo),
        )
        .sort(
          (left, right) =>
            right.uploadedAt.getTime() - left.uploadedAt.getTime() ||
            right.id.localeCompare(left.id),
        )
        .map((document) => [document.id, document] as const),
    ).values(),
  ];
  const offset = input.offset ?? 0;
  return {
    documents: matches.slice(offset, offset + (input.limit ?? 100)),
    total: matches.length,
  };
}
