import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { DocumentDownload, WorkspaceDocument } from "./types";

export const DOCUMENTS_PAGE_SIZE = 200;

export type WorkspaceStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

export type DocumentsView = "templates" | "workspace";

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
    issued: documents.filter((document) => document.status === "issued").length,
    signature: documents.filter(
      (document) => document.status === "pending_signature",
    ).length,
  };
}

export function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível carregar os documentos.",
  );
}

export function openDocumentDownload(download: DocumentDownload) {
  const link = document.createElement("a");
  link.href = download.downloadUrl;
  link.download = download.fileName;
  link.rel = "noopener noreferrer";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
