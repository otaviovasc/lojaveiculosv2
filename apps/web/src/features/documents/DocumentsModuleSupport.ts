import { createDocumentsApi, type DocumentsApi } from "./apiClient";
import { createDocumentsApiOptions } from "./runtimeApi";
import type { WorkspaceDocument } from "./types";

export type WorkspaceStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" };

export type DocumentsView = "templates" | "workspace";

export function createRuntimeDocumentsApi(): DocumentsApi {
  return {
    downloadDocument: async (documentId, versionId) =>
      createDocumentsApi(await createDocumentsApiOptions()).downloadDocument(
        documentId,
        versionId,
      ),
    listDocuments: async (filters) =>
      createDocumentsApi(await createDocumentsApiOptions()).listDocuments(
        filters,
      ),
    listTemplates: async () =>
      createDocumentsApi(await createDocumentsApiOptions()).listTemplates(),
    listVersions: async (documentId) =>
      createDocumentsApi(await createDocumentsApiOptions()).listVersions(
        documentId,
      ),
    previewDocument: async (documentId) =>
      createDocumentsApi(await createDocumentsApiOptions()).previewDocument(
        documentId,
      ),
    regenerateDocument: async (documentId) =>
      createDocumentsApi(await createDocumentsApiOptions()).regenerateDocument(
        documentId,
      ),
    updateTemplate: async (kind, input) =>
      createDocumentsApi(await createDocumentsApiOptions()).updateTemplate(
        kind,
        input,
      ),
    voidDocument: async (documentId, input) =>
      createDocumentsApi(await createDocumentsApiOptions()).voidDocument(
        documentId,
        input,
      ),
  };
}

export function replaceDocument(
  documents: WorkspaceDocument[],
  updated: WorkspaceDocument,
) {
  return documents.map((document) =>
    document.id === updated.id ? updated : document,
  );
}

export function summarizeDocuments(documents: WorkspaceDocument[]) {
  return {
    contexts: new Set(documents.map((document) => document.context.targetType))
      .size,
    issued: documents.filter((document) => document.status === "issued").length,
    signature: documents.filter(
      (document) => document.status === "pending_signature",
    ).length,
  };
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function openDocumentDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
