import { useCallback, useEffect, useRef, useState } from "react";
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
  ListDocumentsFilters,
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
export function useDocumentsModuleState(
  api: DocumentsApi | null,
  query: ListDocumentsFilters,
) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedDocument, setSelectedDocument] =
    useState<WorkspaceDocument | null>(null);
  const [documentPreview, setDocumentPreview] =
    useState<DocumentDownload | null>(null);
  const [documentPreviewError, setDocumentPreviewError] = useState<
    string | null
  >(null);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>(
    [],
  );
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<WorkspaceDocument | null>(null);
  const [isDocumentActionBusy, setIsDocumentActionBusy] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [status, setStatus] = useState<WorkspaceStatus>({ kind: "loading" });
  const requestGenerationRef = useRef(0);
  const pageAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!api) return;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    pageAbortRef.current?.abort();
    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    pageAbortRef.current = controller;
    setDocuments([]);
    setTotalDocuments(0);
    setPaginationError(null);
    setIsLoadingMore(false);
    setSelectedDocument(null);
    setStatus({ kind: "loading" });
    try {
      const page = await api.listDocumentPage(
        { ...query, limit: DOCUMENTS_PAGE_SIZE, offset: 0 },
        { signal: controller.signal },
      );
      if (requestGenerationRef.current !== generation) return;
      const nextDocuments = page.documents;
      setDocuments(nextDocuments);
      setTotalDocuments(page.total);
      setStatus({ kind: "ready" });
    } catch (error) {
      if (requestGenerationRef.current !== generation || isAbortError(error)) {
        return;
      }
      setDocuments([]);
      setTotalDocuments(0);
      setStatus({ kind: "error", message: errorMessage(error) });
    } finally {
      if (pageAbortRef.current === controller) pageAbortRef.current = null;
    }
  }, [api, query]);

  const loadMore = useCallback(async () => {
    if (!api || isLoadingMore || documents.length >= totalDocuments) return;
    const generation = requestGenerationRef.current;
    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;
    setIsLoadingMore(true);
    setPaginationError(null);
    try {
      const page = await api.listDocumentPage(
        {
          ...query,
          limit: DOCUMENTS_PAGE_SIZE,
          offset: documents.length,
        },
        { signal: controller.signal },
      );
      if (requestGenerationRef.current !== generation) return;
      setDocuments((current) => [...current, ...page.documents]);
      setTotalDocuments(page.total);
    } catch (error) {
      if (requestGenerationRef.current !== generation || isAbortError(error)) {
        return;
      }
      setPaginationError(errorMessage(error));
    } finally {
      if (requestGenerationRef.current === generation) {
        setIsLoadingMore(false);
      }
      if (loadMoreAbortRef.current === controller) {
        loadMoreAbortRef.current = null;
      }
    }
  }, [api, documents.length, isLoadingMore, query, totalDocuments]);

  const resetAndReload = useCallback(() => {
    void refresh();
  }, [refresh]);

  const actions = useDocumentsModuleActions({
    documentToDelete,
    documentsApi: api,
    setDocumentPreview,
    setDocumentPreviewError,
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
    if (!api) return;
    void refresh();
    return () => {
      pageAbortRef.current?.abort();
      loadMoreAbortRef.current?.abort();
    };
  }, [api, refresh]);

  useEffect(() => {
    if (!api) return;
    let isCurrent = true;
    void api
      .listTemplates()
      .then((nextTemplates) => {
        if (isCurrent) setTemplates([...nextTemplates]);
      })
      .catch(() => {
        if (isCurrent) setTemplates([]);
      });
    return () => {
      isCurrent = false;
    };
  }, [api]);

  return {
    deleteDocument: actions.deleteDocument,
    documentPreview,
    documentPreviewError,
    documentToDelete,
    documentVersions,
    documents,
    documentsApi: api,
    downloadDocument: actions.downloadDocument,
    isDocumentActionBusy,
    isLoadingMore,
    isSavingTemplate,
    isUploadDialogOpen,
    loadMore,
    paginationError,
    previewDocument: actions.previewDocument,
    refresh,
    resetAndReload,
    saveTemplate: actions.saveTemplate,
    selectedDocument,
    setDocumentPreview,
    setDocumentPreviewError,
    setDocumentToDelete,
    setDocumentVersions,
    setDocuments,
    setIsUploadDialogOpen,
    setSelectedDocument,
    setStatus,
    setTemplates,
    status,
    templates,
    totalDocuments,
    updateDocument: actions.updateDocument,
    applyDocumentAction: actions.applyDocumentAction,
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
