import { useCallback, useEffect, useState } from "react";
import type { DocumentsApi } from "./apiClient";
import {
  DOCUMENTS_PAGE_SIZE,
  type DocumentsView,
  errorMessage,
  summarizeDocuments,
  type WorkspaceStatus,
} from "./DocumentsModuleSupport";
import { useDocumentsModuleActions } from "./useDocumentsModuleActions";
import type {
  DocumentPreview,
  DocumentTemplate,
  DocumentVersion,
  ListDocumentsFilters,
  WorkspaceDocument,
} from "./types";

export function useDocumentsModuleState(api: DocumentsApi | null) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [filters, setFilters] = useState<ListDocumentsFilters>({});
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [view, setView] = useState<DocumentsView>("workspace");
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(
    null,
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [selectedDocument, setSelectedDocument] =
    useState<WorkspaceDocument | null>(null);
  const [documentPreview, setDocumentPreview] =
    useState<DocumentPreview | null>(null);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>(
    [],
  );
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<WorkspaceDocument | null>(null);
  const [isDocumentActionBusy, setIsDocumentActionBusy] = useState(false);
  const [status, setStatus] = useState<WorkspaceStatus>({ kind: "loading" });
  const [, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore] = useState(false);

  const refresh = useCallback(
    async (nextFilters = filters) => {
      if (!api) return;
      setStatus({ kind: "loading" });
      try {
        const [nextDocuments, nextTemplates] = await Promise.all([
          api.listDocuments({
            ...nextFilters,
            limit: DOCUMENTS_PAGE_SIZE,
          }),
          api.listTemplates(),
        ]);
        setDocuments(nextDocuments);
        setHasMore(false);
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
    },
    [api, filters],
  );

  const resetAndReload = useCallback(() => {
    setOffset(0);
    void refresh(filters);
  }, [refresh, filters]);

  const loadMore = useCallback(() => {
    setHasMore(false);
  }, []);

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
    if (api) void refresh(filters);
  }, [api]);

  const updateFilter = useCallback(
    <Key extends keyof ListDocumentsFilters>(
      key: Key,
      value: ListDocumentsFilters[Key],
    ) => {
      const nextFilters = { ...filters, [key]: value };
      setFilters(nextFilters);
      setSelectedFolderKey(null);
      setOffset(0);
      void refresh(nextFilters);
    },
    [filters, refresh],
  );

  const replaceFilters = useCallback(
    (nextFilters: ListDocumentsFilters) => {
      setFilters(nextFilters);
      setSelectedFolderKey(null);
      setOffset(0);
      void refresh(nextFilters);
    },
    [refresh],
  );

  return {
    applyDocumentAction: actions.applyDocumentAction,
    deleteDocument: actions.deleteDocument,
    documentPreview,
    documentToDelete,
    documentVersions,
    documents,
    documentsApi: api,
    downloadDocument: actions.downloadDocument,
    filters,
    hasMore,
    isDocumentActionBusy,
    isLoadingMore,
    isSavingTemplate,
    isUploadDialogOpen,
    loadMore,
    previewDocument: actions.previewDocument,
    resetAndReload,
    saveTemplate: actions.saveTemplate,
    selectedDocument,
    selectedFolderKey,
    setDocumentPreview,
    setDocumentToDelete,
    setDocumentVersions,
    setDocuments,
    setIsUploadDialogOpen,
    setSelectedDocument,
    setSelectedFolderKey,
    setStatus,
    setView,
    status,
    summaries: summarizeDocuments(documents),
    templates,
    updateDocument: actions.updateDocument,
    updateFilter,
    replaceFilters,
    view,
  };
}
