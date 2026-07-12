import { useCallback, useEffect, useMemo, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { InventoryApi } from "../inventory/api/apiClient";
import { createDocumentsApi, type DocumentsApi } from "./apiClient";
import { createDocumentsApiOptions } from "./runtimeApi";
import { DocumentBuilderWorkspace } from "./DocumentBuilderWorkspace";
import { DocumentsFolderSidebar } from "./DocumentsFolderSidebar";
import {
  DocumentsKpiSummary,
  type DocumentOriginFilter,
} from "./DocumentsKpiSummary";
import { DocumentsWorkspaceBody } from "./DocumentsWorkspaceBody";
import {
  DocumentsWorkspaceDialogs,
  type DocumentsMobileTab,
} from "./DocumentsWorkspaceDialogs";
import { DocumentsWorkspaceTopBar } from "./DocumentsWorkspaceTopBar";
import { DEFAULT_DOCUMENTS_SORT } from "./documentsWorkspaceDefaults";
import {
  filterDocumentsForFolder,
  filterDocumentsForWorkspace,
  summarizeWorkspaceDocuments,
  type DocumentVehicleOption,
  type DocumentsFolderKey,
} from "./documentDisplayModel";
import {
  EMPTY_DOCUMENT_FILTERS,
  filterByOrigin,
  hasActiveDocumentFilters,
  sortDocuments,
  type DocumentsSortKey,
  type DocumentsWorkspaceFilters,
} from "./documentWorkspaceFilters";
import { resolveDocumentUploadTarget } from "./documentUploadTarget";
import { useDocumentUnitFolders } from "./useDocumentUnitFolders";
import { useDocumentsBulkSelection } from "./useDocumentsBulkSelection";
import { useDocumentsModuleState } from "./useDocumentsModuleState";
import type { WorkspaceDocument } from "./types";

export function DocumentsModule({
  api,
  inventoryApi,
}: {
  api?: DocumentsApi;
  inventoryApi?: InventoryApi;
}) {
  const [runtimeApi, setRuntimeApi] = useState<DocumentsApi | null>(
    api ?? null,
  );
  const [selectedFolderKey, setSelectedFolderKey] =
    useState<DocumentsFolderKey>("general");
  const [originFilter, setOriginFilter] = useState<DocumentOriginFilter>("all");
  const [sortBy, setSortBy] = useState<DocumentsSortKey>(
    DEFAULT_DOCUMENTS_SORT,
  );
  const [filters, setFilters] = useState<DocumentsWorkspaceFilters>(
    EMPTY_DOCUMENT_FILTERS,
  );
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<DocumentsMobileTab>("documentos");
  const [linkDocument, setLinkDocument] = useState<WorkspaceDocument | null>(
    null,
  );

  useEffect(() => {
    if (api) {
      setRuntimeApi(api);
    } else {
      void createDocumentsApiOptions().then((opts) =>
        setRuntimeApi(createDocumentsApi(opts)),
      );
    }
  }, [api]);

  const state = useDocumentsModuleState(runtimeApi);
  const unitFolders = useDocumentUnitFolders(state.documents, inventoryApi);
  const vehicleOptions = unitFolders.options;

  const folderDocuments = useMemo(
    () => filterDocumentsForFolder(state.documents, selectedFolderKey),
    [selectedFolderKey, state.documents],
  );
  const originScoped = useMemo(
    () => filterByOrigin(folderDocuments, originFilter),
    [folderDocuments, originFilter],
  );
  const filteredDocuments = useMemo(
    () => filterDocumentsForWorkspace(originScoped, filters),
    [originScoped, filters],
  );
  const sortedVisible = useMemo(
    () => sortDocuments(filteredDocuments, sortBy),
    [filteredDocuments, sortBy],
  );
  const summary = useMemo(
    () => buildKpiSummary(state.documents),
    [state.documents],
  );

  const hasFilters = hasActiveDocumentFilters(filters);
  const isLoading = state.status.kind === "loading";
  const errorMessage =
    state.status.kind === "error" ? state.status.message : null;

  const selectedUnit = selectedFolderKey.startsWith("unit:")
    ? (vehicleOptions.find(
        (vehicle) => selectedFolderKey === `unit:${vehicle.id}`,
      ) ?? null)
    : null;
  const folderTitle =
    selectedFolderKey === "general"
      ? "Geral"
      : (selectedUnit?.label ?? "Unidade");
  const folderSubtitle =
    selectedFolderKey === "general"
      ? "Loja e documentos sem unidade"
      : "Documentos desta unidade";

  const uploadTarget = resolveDocumentUploadTarget(
    selectedFolderKey,
    selectedUnit,
  );
  const showUpload = Boolean(uploadTarget);
  const uploadTitle = uploadTarget
    ? "Enviar documento para esta pasta"
    : "Esta unidade ainda não tem vínculo de anúncio para envio";

  const selection = useDocumentsBulkSelection(sortedVisible);
  const visibleSelectedCount = selection.visibleSelectedCount;

  const setFilter = useCallback(
    <Key extends keyof DocumentsWorkspaceFilters>(
      key: Key,
      value: DocumentsWorkspaceFilters[Key],
    ) => setFilters((current) => ({ ...current, [key]: value })),
    [],
  );
  const resetFilters = useCallback(
    () => setFilters(EMPTY_DOCUMENT_FILTERS),
    [],
  );
  const clearAllFilters = useCallback(() => {
    setOriginFilter("all");
    resetFilters();
  }, [resetFilters]);

  const selectDocument = (document: WorkspaceDocument) => {
    state.setDocumentPreview(null);
    state.setDocumentPreviewError(null);
    state.setDocumentVersions([]);
    state.setSelectedDocument(document);
  };
  const closeDetail = () => {
    state.setSelectedDocument(null);
    state.setDocumentPreview(null);
    state.setDocumentPreviewError(null);
    state.setDocumentVersions([]);
  };
  const selectFolder = (folderKey: DocumentsFolderKey) => {
    setSelectedFolderKey(folderKey);
    setMobileTab("documentos");
    closeDetail();
    setLinkDocument(null);
    selection.clear();
  };
  const openMobileFolders = useCallback(() => setMobileTab("pastas"), []);

  const onDownloadSelected = useCallback(
    () => selection.downloadSelected(state.downloadDocument),
    [selection, state.downloadDocument],
  );

  if (isBuilderOpen) {
    return (
      <DocumentBuilderWorkspace
        api={runtimeApi}
        isSaving={state.isSavingTemplate}
        onClose={() => setIsBuilderOpen(false)}
        onSave={state.saveTemplate}
        templates={state.templates}
      />
    );
  }

  return (
    <FeaturePageShell className="documents-page" mainClassName="documents-main">
      <DocumentsWorkspaceTopBar
        folderSubtitle={folderSubtitle}
        folderTitle={folderTitle}
        isRefreshing={isLoading}
        isUploading={!runtimeApi || !uploadTarget}
        onOpenFolders={openMobileFolders}
        onOpenTemplates={() => setIsBuilderOpen(true)}
        onRefresh={() => void state.resetAndReload()}
        onUpload={() => state.setIsUploadDialogOpen(true)}
        selectedKey={selectedFolderKey}
        showUpload={showUpload}
        unitLabel={selectedUnit ? selectedUnit.label : null}
        uploadTitle={uploadTitle}
      />

      <DocumentsKpiSummary
        activeOrigin={originFilter}
        isLoading={isLoading}
        onOriginSelect={setOriginFilter}
        summary={summary}
      />

      {errorMessage ? (
        <FeatureAlert
          action={
            <button onClick={() => void state.resetAndReload()} type="button">
              Tentar novamente
            </button>
          }
          className="documents-state documents-error-state"
          title="Não foi possível carregar os documentos"
        >
          <p>{errorMessage}</p>
        </FeatureAlert>
      ) : null}

      <section className="documents-command-layout">
        <div className="documents-desktop-folders">
          <DocumentsFolderSidebar
            documents={state.documents}
            isLoading={unitFolders.status === "loading"}
            onSelect={selectFolder}
            selectedKey={selectedFolderKey}
            vehicleOptions={vehicleOptions}
          />
        </div>

        <DocumentsWorkspaceBody
          api={runtimeApi}
          clearAllFilters={clearAllFilters}
          errorMessage={errorMessage}
          filters={filters}
          folderDocuments={folderDocuments}
          hasActiveFilters={hasFilters}
          isLoading={isLoading}
          onCloseDetail={closeDetail}
          onDownloadDocument={state.downloadDocument}
          onDownloadSelected={() => {
            void onDownloadSelected();
          }}
          onKindChange={(value) => setFilter("kind", value)}
          onOriginSelect={setOriginFilter}
          onPreviewDocument={state.previewDocument}
          onSearchChange={(value) => setFilter("search", value)}
          onSelectDocument={selectDocument}
          onSetDocumentToDelete={state.setDocumentToDelete}
          onSetFilter={setFilter}
          onSetLinkDocument={setLinkDocument}
          onSortChange={setSortBy}
          onStatusChange={(value) => setFilter("status", value)}
          onUploadClick={() => state.setIsUploadDialogOpen(true)}
          originFilter={originFilter}
          search={filters.search}
          selectedFolderKey={selectedFolderKey}
          showUpload={showUpload}
          sortBy={sortBy}
          sortedVisible={sortedVisible}
          state={state}
          selection={selection}
          updateDocument={state.updateDocument}
          visibleSelectedCount={visibleSelectedCount}
        />
      </section>

      <DocumentsWorkspaceDialogs
        deleteDocument={state.deleteDocument}
        documentToDelete={state.documentToDelete}
        documents={state.documents}
        isDocumentActionBusy={state.isDocumentActionBusy}
        isUploadDialogOpen={state.isUploadDialogOpen}
        linkDocument={linkDocument}
        mobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
        onRefresh={state.resetAndReload}
        onSelectFolder={selectFolder}
        onUpdateDocument={state.updateDocument}
        runtimeApi={runtimeApi}
        selectedKey={selectedFolderKey}
        setDocumentToDelete={state.setDocumentToDelete}
        setIsUploadDialogOpen={state.setIsUploadDialogOpen}
        setLinkDocument={setLinkDocument}
        unitFoldersStatus={unitFolders.status}
        uploadTarget={uploadTarget}
        vehicleOptions={vehicleOptions as readonly DocumentVehicleOption[]}
      />
    </FeaturePageShell>
  );
}

function buildKpiSummary(documents: readonly WorkspaceDocument[]) {
  const base = summarizeWorkspaceDocuments(documents);
  return {
    automatic: base.automatic,
    manual: base.manual,
    total: base.total,
    vehicles: base.linkedToVehicles,
  };
}
