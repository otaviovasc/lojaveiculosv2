import type { ListDocumentsFilters } from "./types";

export type DocumentDownloadRouteOptions = {
  disposition?: "attachment" | "inline";
  versionId?: string;
};

export const documentsRoutes = {
  content: (
    documentId: string,
    options: Pick<DocumentDownloadRouteOptions, "versionId"> = {},
    baseUrl?: string,
  ) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/content${createDownloadQuery(
        options,
      )}`,
      baseUrl,
    ),
  document: (documentId: string, baseUrl?: string) =>
    createEndpoint(`/documents/${encodeURIComponent(documentId)}`, baseUrl),
  documents: (filters: ListDocumentsFilters = {}, baseUrl?: string) =>
    createEndpoint(`/documents${createQuery(filters)}`, baseUrl),
  download: (
    documentId: string,
    options: DocumentDownloadRouteOptions = {},
    baseUrl?: string,
  ) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/download${createDownloadQuery(
        options,
      )}`,
      baseUrl,
    ),
  preview: (documentId: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/preview`,
      baseUrl,
    ),
  regenerate: (documentId: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/regenerate`,
      baseUrl,
    ),
  template: (templateKey: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/templates/${encodeURIComponent(templateKey)}`,
      baseUrl,
    ),
  templateSuggestion: (templateKey: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/templates/${encodeURIComponent(templateKey)}/suggestions`,
      baseUrl,
    ),
  templateSuggestionOutcome: (templateKey: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/templates/${encodeURIComponent(
        templateKey,
      )}/suggestions/outcome`,
      baseUrl,
    ),
  templates: (baseUrl?: string) =>
    createEndpoint("/documents/templates", baseUrl),
  unitDocuments: (unitId: string, baseUrl?: string) =>
    createEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/documents`,
      baseUrl,
    ),
  unitUploads: (unitId: string, baseUrl?: string) =>
    createEndpoint(
      `/inventory/units/${encodeURIComponent(unitId)}/documents/uploads`,
      baseUrl,
    ),
  uploads: (baseUrl?: string) => createEndpoint("/documents/uploads", baseUrl),
  versions: (documentId: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/versions`,
      baseUrl,
    ),
  void: (documentId: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/void`,
      baseUrl,
    ),
} as const;

function createQuery(filters: ListDocumentsFilters): string {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.status) params.set("status", filters.status);
  if (filters.targetId?.trim()) params.set("targetId", filters.targetId.trim());
  if (filters.targetType) params.set("targetType", filters.targetType);
  if (filters.limit) params.set("limit", String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function createDownloadQuery(options: DocumentDownloadRouteOptions): string {
  const params = new URLSearchParams();
  if (options.versionId) params.set("versionId", options.versionId);
  if (options.disposition === "inline") params.set("disposition", "inline");
  const query = params.toString();
  return query ? `?${query}` : "";
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
