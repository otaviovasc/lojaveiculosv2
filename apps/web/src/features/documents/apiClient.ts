import { readApiJson } from "../../lib/apiErrors";
import type {
  DocumentsAuth,
  CreateUploadedDocumentInput,
  CreateVehicleUploadedDocumentInput,
  DocumentDownload,
  DocumentKind,
  DocumentPreview,
  DocumentTemplate,
  DocumentUpload,
  DocumentVersion,
  ListDocumentsFilters,
  RequestDocumentUploadInput,
  RequestVehicleDocumentUploadInput,
  UpdateDocumentInput,
  UpdateDocumentTemplateInput,
  VoidDocumentInput,
  WorkspaceDocument,
} from "./types";

export type DocumentDownloadOptions = {
  disposition?: "attachment" | "inline";
  versionId?: string;
};

export type DocumentsApi = {
  createUploadedDocument: (
    input: CreateUploadedDocumentInput,
  ) => Promise<WorkspaceDocument>;
  createUnitUploadedDocument: (
    unitId: string,
    input: CreateVehicleUploadedDocumentInput,
  ) => Promise<WorkspaceDocument>;
  deleteDocument: (documentId: string) => Promise<WorkspaceDocument>;
  downloadDocument: (
    documentId: string,
    options?: DocumentDownloadOptions,
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
  requestUnitDocumentUpload: (
    unitId: string,
    input: RequestVehicleDocumentUploadInput,
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
    createUnitUploadedDocument: (unitId, input) =>
      fetch(documentsRoutes.unitDocuments(unitId, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "POST",
      })
        .then(readJson<VehicleUploadedDocumentResponse>)
        .then(mapVehicleUploadedDocument),
    deleteDocument: (documentId) =>
      fetch(documentsRoutes.document(documentId, baseUrl), {
        headers: createDocumentsHeaders(auth),
        method: "DELETE",
      }).then(readJson<WorkspaceDocument>),
    downloadDocument: (documentId, options = {}) =>
      fetch(documentsRoutes.download(documentId, options, baseUrl), {
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
    requestUnitDocumentUpload: (unitId, input) =>
      fetch(documentsRoutes.unitUploads(unitId, baseUrl), {
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
  download: (
    documentId: string,
    options: DocumentDownloadOptions = {},
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
  template: (kind: DocumentKind, baseUrl?: string) =>
    createEndpoint(`/documents/templates/${encodeURIComponent(kind)}`, baseUrl),
  templates: (baseUrl?: string) =>
    createEndpoint("/documents/templates", baseUrl),
  uploads: (baseUrl?: string) => createEndpoint("/documents/uploads", baseUrl),
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

function createDownloadQuery(options: DocumentDownloadOptions): string {
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

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Documentos" });
}

type VehicleUploadedDocumentResponse = {
  createdAt: string;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  kind: DocumentKind;
  linkRole: string;
  metadata: Record<string, unknown>;
  mimeType: string | null;
  status: WorkspaceDocument["status"];
  targetId: string;
  targetType: WorkspaceDocument["context"]["targetType"];
  title: string;
  updatedAt: string;
  uploadedAt: string;
};

function mapVehicleUploadedDocument(
  document: VehicleUploadedDocumentResponse,
): WorkspaceDocument {
  return {
    context: {
      linkRole: document.linkRole,
      targetId: document.targetId,
      targetType: document.targetType,
    },
    createdAt: document.createdAt,
    file: {
      fileName: document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      mimeType: document.mimeType,
    },
    id: document.id,
    kind: document.kind,
    metadata: document.metadata,
    status: document.status,
    title: document.title,
    updatedAt: document.updatedAt,
    uploadedAt: document.uploadedAt,
  };
}
