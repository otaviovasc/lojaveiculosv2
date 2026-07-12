import { readApiJson } from "../../lib/apiErrors";
import type {
  DocumentsAuth,
  CreateUploadedDocumentInput,
  CreateVehicleUploadedDocumentInput,
  DocumentDownload,
  DocumentKind,
  DocumentPreview,
  DocumentTemplate,
  DocumentTemplateSuggestionOutcome,
  DocumentTemplateSuggestion,
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
import {
  documentsRoutes,
  type DocumentDownloadRouteOptions,
} from "./documentApiRoutes";

export { documentsRoutes } from "./documentApiRoutes";

export type DocumentDownloadOptions = DocumentDownloadRouteOptions;

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
    templateKey: string,
    input: UpdateDocumentTemplateInput,
  ) => Promise<DocumentTemplate>;
  suggestTemplateEdit: (
    templateKey: string,
    input: UpdateDocumentTemplateInput & { instruction: string },
  ) => Promise<DocumentTemplateSuggestion>;
  recordTemplateSuggestionOutcome: (
    templateKey: string,
    input: { diffCount: number; outcome: DocumentTemplateSuggestionOutcome },
  ) => Promise<{ recordedAt: string }>;
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
      })
        .then(readJson<DocumentDownload>)
        .then((download) => ({
          ...download,
          contentHeaders: createDocumentsContentHeaders(auth),
          contentUrl: documentsRoutes.content(
            documentId,
            options.versionId ? { versionId: options.versionId } : {},
            baseUrl,
          ),
        })),
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
    updateTemplate: (templateKey, input) =>
      fetch(documentsRoutes.template(templateKey, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "PUT",
      }).then(readJson<DocumentTemplate>),
    suggestTemplateEdit: (templateKey, input) =>
      fetch(documentsRoutes.templateSuggestion(templateKey, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "POST",
      }).then(readJson<DocumentTemplateSuggestion>),
    recordTemplateSuggestionOutcome: (templateKey, input) =>
      fetch(documentsRoutes.templateSuggestionOutcome(templateKey, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "POST",
      }).then(readJson<{ recordedAt: string }>),
    voidDocument: (documentId, input) =>
      fetch(documentsRoutes.void(documentId, baseUrl), {
        body: JSON.stringify(input),
        headers: createDocumentsHeaders(auth),
        method: "POST",
      }).then(readJson<WorkspaceDocument>),
  };
}

export function createDocumentsHeaders(auth: DocumentsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createDocumentsContentHeaders(auth: DocumentsAuth) {
  const headers = createDocumentsHeaders(auth) as Record<string, string>;
  const { ["Content-Type"]: _contentType, ...contentHeaders } = headers;
  return contentHeaders;
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
    capabilities: {
      canRegenerate: false,
      regenerateBlockReason: "renderer_unavailable",
    },
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
