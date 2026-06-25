import { documentOrigin, type DocumentOrigin } from "./documentDisplayModel";
import type { DocumentsWorkspaceFilters } from "./documentDisplayModel";
import { hasActiveDocumentFilters } from "./documentDisplayModel";
import type { WorkspaceDocument } from "./types";

export { hasActiveDocumentFilters, type DocumentsWorkspaceFilters };

export const EMPTY_DOCUMENT_FILTERS: DocumentsWorkspaceFilters = {
  dateFrom: "",
  dateTo: "",
  kind: "",
  origin: "all",
  scope: "all",
  search: "",
  status: "",
  vehicleId: "",
};

export type DocumentOriginFilter = "all" | DocumentOrigin;

export function filterByOrigin(
  documents: readonly WorkspaceDocument[],
  origin: DocumentOriginFilter,
) {
  if (origin === "all") return documents;
  return documents.filter((document) => documentOrigin(document) === origin);
}

export function sortByCreatedDesc(
  documents: readonly WorkspaceDocument[],
): WorkspaceDocument[] {
  return [...documents].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export type DocumentsSortKey =
  | "created_asc"
  | "created_desc"
  | "status_asc"
  | "title_asc"
  | "title_desc";

export function sortDocuments(
  documents: readonly WorkspaceDocument[],
  key: DocumentsSortKey,
): WorkspaceDocument[] {
  const copy = [...documents];
  switch (key) {
    case "created_asc":
      return copy.sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      );
    case "created_desc":
      return sortByCreatedDesc(documents);
    case "title_asc":
      return copy.sort((left, right) => left.title.localeCompare(right.title));
    case "title_desc":
      return copy.sort((left, right) => right.title.localeCompare(left.title));
    case "status_asc":
      return copy.sort((left, right) =>
        left.status.localeCompare(right.status),
      );
    default:
      return copy;
  }
}
