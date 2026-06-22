import { useEffect, useMemo, useState } from "react";
import type { DocumentsApi } from "./apiClient";
import type { DocumentUploadTarget } from "./DocumentUploadDialog";
import type { WorkspaceViewMode } from "./DocumentWorkspacePanel";
import {
  createRuntimeDocumentsApi,
  DOCUMENTS_WORKSPACE_LIMIT,
  type DocumentsView,
  errorMessage,
  summarizeDocuments,
  type WorkspaceStatus,
} from "./DocumentsModuleSupport";
import { buildDocumentFolders } from "./documentsWorkspaceModel";
import { useDocumentsModuleActions } from "./useDocumentsModuleActions";
import type {
  DocumentPreview,
  DocumentTemplate,
  DocumentVersion,
  ListDocumentsFilters,
  WorkspaceDocument,
} from "./types";

export function useDocumentsModuleState(api?: DocumentsApi) {
  const documentsApi = useMemo(() => api ?? createRuntimeDocumentsApi(), [api]);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [filters, setFilters] = useState<ListDocumentsFilters>({});
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [view, setView] = useState<DocumentsView>("workspace");
  const [workspaceViewMode, setWorkspaceViewMode] =
    useState<WorkspaceViewMode>("folders");
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

  const refresh = async (nextFilters = filters) => {
    setStatus({ kind: "loading" });
    try {
      const [nextDocuments, nextTemplates] = await Promise.all([
        documentsApi.listDocuments({
          ...nextFilters,
          limit: DOCUMENTS_WORKSPACE_LIMIT,
        }),
        documentsApi.listTemplates(),
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
  };

  const actions = useDocumentsModuleActions({
    documentToDelete,
    documentsApi,
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
    void refresh();
  }, []);

  const updateFilter = <Key extends keyof ListDocumentsFilters>(
    key: Key,
    value: ListDocumentsFilters[Key],
  ) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    setSelectedFolderKey(null);
    void refresh(nextFilters);
  };

  const folders = buildDocumentFolders(documents);
  const uploadTarget: DocumentUploadTarget = { label: "Documentos gerais" };

  return {
    applyDocumentAction: actions.applyDocumentAction,
    deleteDocument: actions.deleteDocument,
    documentPreview,
    documentToDelete,
    documentVersions,
    documents,
    documentsApi,
    downloadDocument: actions.downloadDocument,
    filters,
    folders,
    isDocumentActionBusy,
    isResultCapped: documents.length >= DOCUMENTS_WORKSPACE_LIMIT,
    isSavingTemplate,
    isUploadDialogOpen,
    previewDocument: actions.previewDocument,
    refresh,
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
    setWorkspaceViewMode,
    status,
    summaries: summarizeDocuments(documents),
    templates,
    updateDocument: actions.updateDocument,
    updateFilter,
    uploadTarget,
    view,
    workspaceViewMode,
  };
}
