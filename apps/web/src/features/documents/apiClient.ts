import type {
  DocumentsAuth,
  CreateUploadedDocumentInput,
  DocumentDownload,
  DocumentKind,
  DocumentPreview,
  DocumentTemplate,
  DocumentUpload,
  DocumentVersion,
  ListDocumentsFilters,
  RequestDocumentUploadInput,
  UpdateDocumentInput,
  UpdateDocumentTemplateInput,
  VoidDocumentInput,
  WorkspaceDocument,
} from "./types";

export type DocumentsApi = {
  createUploadedDocument: (
    input: CreateUploadedDocumentInput,
  ) => Promise<WorkspaceDocument>;
  deleteDocument: (documentId: string) => Promise<WorkspaceDocument>;
  downloadDocument: (
    documentId: string,
    versionId?: string,
  ) => Promise<DocumentDownload>;
  listDocuments: (
    filters?: ListDocumentsFilters,
  ) => Promise<WorkspaceDocument[]>;
  listTemplates: () => Promise<DocumentTemplate[]>;
  listVersions: (documentId: string) => Promise<DocumentVersion[]>;
  previewDocument: (documentId: string) => Promise<DocumentPreview>;
  regenerateDocument: (documentId: string) => Promise<WorkspaceDocument>;
  requestDocumentUpload: (
    input: RequestDocumentUploadInput,
  ) => Promise<DocumentUpload>;
  updateDocument: (
    documentId: string,
    input: UpdateDocumentInput,
  ) => Promise<WorkspaceDocument>;
  updateTemplate: (
    kind: DocumentKind,
    input: UpdateDocumentTemplateInput,
  ) => Promise<DocumentTemplate>;
  voidDocument: (
    documentId: string,
    input: VoidDocumentInput,
  ) => Promise<WorkspaceDocument>;
};

export type CreateDocumentsApiOptions = {
  auth?: DocumentsAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createDocumentsApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateDocumentsApiOptions): DocumentsApi {
  return {
    createUploadedDocument: (input) =>
      fetch(documentsRoutes.documents({}, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "POST",
      }).then(readJson<WorkspaceDocument>),
    deleteDocument: (documentId) =>
      fetch(documentsRoutes.document(documentId, baseUrl), {
        headers: createDocumentsHeaders(auth),
        method: "DELETE",
      }).then(readJson<WorkspaceDocument>),
    downloadDocument: (documentId, versionId) =>
      fetch(documentsRoutes.download(documentId, versionId, baseUrl), {
        headers: createDocumentsHeaders(auth),
      }).then(readJson<DocumentDownload>),
    listDocuments: (filters = {}) =>
      fetch(documentsRoutes.documents(filters, baseUrl), {
        headers: createDocumentsHeaders(auth),
      })
        .then(readJson<{ documents: WorkspaceDocument[] }>)
        .then((payload) => payload.documents),
    listTemplates: () =>
      fetch(documentsRoutes.templates(baseUrl), {
        headers: createDocumentsHeaders(auth),
      })
        .then(readJson<{ templates: DocumentTemplate[] }>)
        .then((payload) => payload.templates),
    listVersions: (documentId) =>
      fetch(documentsRoutes.versions(documentId, baseUrl), {
        headers: createDocumentsHeaders(auth),
      })
        .then(readJson<{ versions: DocumentVersion[] }>)
        .then((payload) => payload.versions),
    previewDocument: (documentId) =>
      fetch(documentsRoutes.preview(documentId, baseUrl), {
        headers: createDocumentsHeaders(auth),
      }).then(readJson<DocumentPreview>),
    regenerateDocument: (documentId) =>
      fetch(documentsRoutes.regenerate(documentId, baseUrl), {
        headers: createDocumentsHeaders(auth),
        method: "POST",
      }).then(readJson<WorkspaceDocument>),
    requestDocumentUpload: (input) =>
      fetch(documentsRoutes.uploads(baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "POST",
      }).then(readJson<DocumentUpload>),
    updateDocument: (documentId, input) =>
      fetch(documentsRoutes.document(documentId, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "PATCH",
      }).then(readJson<WorkspaceDocument>),
    updateTemplate: (kind, input) =>
      fetch(documentsRoutes.template(kind, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "PUT",
      }).then(readJson<DocumentTemplate>),
    voidDocument: (documentId, input) =>
      fetch(documentsRoutes.void(documentId, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "POST",
      }).then(readJson<WorkspaceDocument>),
  };
}

export const documentsRoutes = {
  document: (documentId: string, baseUrl?: string) =>
    createEndpoint(`/documents/${encodeURIComponent(documentId)}`, baseUrl),
  documents: (filters: ListDocumentsFilters = {}, baseUrl?: string) =>
    createEndpoint(`/documents${createQuery(filters)}`, baseUrl),
  download: (documentId: string, versionId?: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/download${createVersionQuery(
        versionId,
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
  template: (kind: DocumentKind, baseUrl?: string) =>
    createEndpoint(`/documents/templates/${encodeURIComponent(kind)}`, baseUrl),
  templates: (baseUrl?: string) =>
    createEndpoint("/documents/templates", baseUrl),
  uploads: (baseUrl?: string) => createEndpoint("/documents/uploads", baseUrl),
  void: (documentId: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/void`,
      baseUrl,
    ),
  versions: (documentId: string, baseUrl?: string) =>
    createEndpoint(
      `/documents/${encodeURIComponent(documentId)}/versions`,
      baseUrl,
    ),
} as const;

export function createDocumentsHeaders(auth: DocumentsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

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

function createVersionQuery(versionId?: string): string {
  if (!versionId) return "";
  return `?versionId=${encodeURIComponent(versionId)}`;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Documents request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
