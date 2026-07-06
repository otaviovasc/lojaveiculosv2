import { useCallback, useEffect, useState } from "react";
import type { DocumentsApi } from "./apiClient";
import {
  DOCUMENTS_PAGE_SIZE,
  type WorkspaceStatus,
  errorMessage,
} from "./DocumentsModuleSupport";
import { useDocumentsModuleActions } from "./useDocumentsModuleActions";
import type {
  DocumentDownload,
  DocumentTemplate,
  DocumentVersion,
  WorkspaceDocument,
} from "./types";

/**
 * Infrastructure-layer state container for the documents workspace.
 *
 * Owns the documents/tempmlates/preview cache, the current document
 * selection, and busy/error flags. Folder selection, filters, view mode
 * and sort are kept locally in `DocumentsModule` because they are pure UI
 * state and the workspace will be re-derivable in the future from URL
 * search params.
 */
export function useDocumentsModuleState(api: DocumentsApi | null) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<WorkspaceDocument | null>(null);
  const [documentPreview, setDocumentPreview] =
    useState<DocumentDownload | null>(null);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>(
    [],
  );
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<WorkspaceDocument | null>(null);
  const [isDocumentActionBusy, setIsDocumentActionBusy] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [status, setStatus] = useState<WorkspaceStatus>({ kind: "loading" });

  const refresh = useCallback(async () => {
    if (!api) return;
    setStatus({ kind: "loading" });
    try {
      const [nextDocuments, nextTemplates] = await Promise.all([
        api.listDocuments({ limit: DOCUMENTS_PAGE_SIZE }),
        api.listTemplates(),
      ]);
      setDocuments(nextDocuments);
      setSelectedDocument((current) =>
        current
          ? (nextDocuments.find((document) => document.id === current.id) ??
            null)
          : null,
      );
      setTemplates([...nextTemplates]);
      setStatus({ kind: "ready" });
    } catch (error) {
      setDocuments([]);
      setTemplates([]);
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  }, [api]);

  const resetAndReload = useCallback(() => {
    void refresh();
  }, [refresh]);

  const actions = useDocumentsModuleActions({
    documentToDelete,
    documentsApi: api,
    setDocumentPreview,
    setDocumentToDelete,
    setDocumentVersions,
    setDocuments,
    setIsDocumentActionBusy,
    setIsSavingTemplate,
    setSelectedDocument,
    setStatus,
    setTemplates,
  });

  useEffect(() => {
    if (api) void refresh();
  }, [api, refresh]);

  return {
    deleteDocument: actions.deleteDocument,
    documentPreview,
    documentToDelete,
    documentVersions,
    documents,
    documentsApi: api,
    downloadDocument: actions.downloadDocument,
    isDocumentActionBusy,
    isSavingTemplate,
    isUploadDialogOpen,
    previewDocument: actions.previewDocument,
    refresh,
    resetAndReload,
    saveTemplate: actions.saveTemplate,
    selectedDocument,
    setDocumentPreview,
    setDocumentToDelete,
    setDocumentVersions,
    setDocuments,
    setIsUploadDialogOpen,
    setSelectedDocument,
    setStatus,
    setTemplates,
    status,
    templates,
    updateDocument: actions.updateDocument,
    applyDocumentAction: actions.applyDocumentAction,
  };
}
