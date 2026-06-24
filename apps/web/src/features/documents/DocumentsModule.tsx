import { useCallback, useEffect, useMemo, useState } from "react";
import type { InventoryApi } from "../inventory/api/apiClient";
import { createDocumentsApi, type DocumentsApi } from "./apiClient";
import { createDocumentsApiOptions } from "./runtimeApi";
import { DocumentDeleteDialog } from "./DocumentDeleteDialog";
import { DocumentDetailPanel } from "./DocumentDetailPanel";
import { DocumentManageLinksDialog } from "./DocumentManageLinksDialog";
import { DocumentTemplatesDialog } from "./DocumentTemplatesDialog";
import { DocumentsFiltersPanel } from "./DocumentsFiltersPanel";
import { DocumentsFolderNavigator } from "./DocumentsFolderNavigator";
import {
  DocumentsEmptyState,
  DocumentsListHeading,
  DocumentsTableSkeleton,
} from "./DocumentsModuleParts";
import { DocumentsSummaryCards } from "./DocumentsSummaryCards";
import { DocumentsTable } from "./DocumentWorkspaceTable";
import {
  filterDocumentsForFolder,
  filterDocumentsForWorkspace,
  hasActiveDocumentFilters,
  summarizeWorkspaceDocuments,
  type DocumentsFolderKey,
  type DocumentsWorkspaceFilters,
} from "./documentDisplayModel";
import { resolveDocumentUploadTarget } from "./documentUploadTarget";
import { DocumentUploadDialog } from "./DocumentUploadDialog";
import { useDocumentUnitFolders } from "./useDocumentUnitFolders";
import { useDocumentsModuleState } from "./useDocumentsModuleState";
import type { WorkspaceDocument } from "./types";

const emptyFilters: DocumentsWorkspaceFilters = {
  dateFrom: "",
  dateTo: "",
  kind: "",
  origin: "all",
  scope: "all",
  search: "",
  status: "",
  vehicleId: "",
};

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
  const [filters, setFilters] =
    useState<DocumentsWorkspaceFilters>(emptyFilters);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [selectedFolderKey, setSelectedFolderKey] =
    useState<DocumentsFolderKey | null>(null);
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
  const visibleDocuments = useMemo(
    () => filterDocumentsForWorkspace(folderDocuments, filters),
    [filters, folderDocuments],
  );
  const summary = summarizeWorkspaceDocuments(state.documents);
  const hasFilters = hasActiveDocumentFilters(filters);
  const isLoading = state.status.kind === "loading";
  const errorMessage =
    state.status.kind === "error" ? state.status.message : null;
  const selectedUnit = selectedFolderKey?.startsWith("unit:")
    ? vehicleOptions.find(
        (vehicle) => selectedFolderKey === `unit:${vehicle.id}`,
      )
    : null;
  const selectedFolderTitle =
    selectedFolderKey === "general"
      ? "Geral"
      : (selectedUnit?.label ?? "Unidade");
  const uploadTarget = resolveDocumentUploadTarget(
    selectedFolderKey,
    selectedUnit,
  );

  const updateFilters = useCallback(
    (nextFilters: DocumentsWorkspaceFilters) => {
      setFilters(nextFilters);
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(emptyFilters);
  }, []);

  const selectDocument = (document: WorkspaceDocument) => {
    state.setDocumentPreview(null);
    state.setDocumentVersions([]);
    state.setSelectedDocument(document);
  };

  const closeDetail = () => {
    state.setSelectedDocument(null);
    state.setDocumentPreview(null);
    state.setDocumentVersions([]);
  };

  const selectFolder = (folderKey: DocumentsFolderKey) => {
    setSelectedFolderKey(folderKey);
    resetFilters();
    closeDetail();
    setIsMobileFiltersOpen(false);
  };

  return (
    <div className="documents-page relative min-h-screen store-dashboard overflow-hidden">
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <main className="documents-main dashboard-main relative z-10">
        <DocumentsSummaryCards summary={summary} />

        {errorMessage ? (
          <section className="documents-state documents-error-state">
            <strong>Não foi possível carregar os documentos</strong>
            <p>{errorMessage}</p>
            <button onClick={() => void state.resetAndReload()} type="button">
              Tentar novamente
            </button>
          </section>
        ) : null}

        <section className="documents-command-layout">
          <div className="documents-desktop-folders">
            <DocumentsFolderNavigator
              documents={state.documents}
              isLoading={unitFolders.status === "loading"}
              onSelect={selectFolder}
              selectedKey={selectedFolderKey}
              vehicleOptions={vehicleOptions}
            />
          </div>

          <section
            className="documents-list-panel"
            aria-label="Lista de documentos"
          >
            {state.selectedDocument ? (
              <DocumentDetailPanel
                document={state.selectedDocument}
                isBusy={state.isDocumentActionBusy}
                onClose={closeDetail}
                onDelete={state.setDocumentToDelete}
                onDownload={state.downloadDocument}
                onManageLinks={setLinkDocument}
                onPreview={state.previewDocument}
                onRegenerate={async (documentId) => {
                  await state.applyDocumentAction(() =>
                    runtimeApi!.regenerateDocument(documentId),
                  );
                }}
                onUpdate={state.updateDocument}
                preview={state.documentPreview}
                versions={state.documentVersions}
              />
            ) : (
              <>
                <DocumentsListHeading
                  isUploadDisabled={!runtimeApi || !uploadTarget}
                  isRefreshing={isLoading}
                  onOpenFolders={() => setIsMobileFiltersOpen(true)}
                  onOpenTemplates={() => setIsTemplatesDialogOpen(true)}
                  onRefresh={() => void state.resetAndReload()}
                  onUpload={() => state.setIsUploadDialogOpen(true)}
                  showUpload={Boolean(selectedFolderKey)}
                  subtitle={
                    selectedFolderKey
                      ? `${visibleDocuments.length} de ${folderDocuments.length} documentos nesta pasta`
                      : "Escolha Geral ou uma unidade para listar documentos"
                  }
                  title={
                    selectedFolderKey
                      ? selectedFolderTitle
                      : "Selecione uma pasta"
                  }
                  uploadTitle={
                    uploadTarget
                      ? "Enviar documento para esta pasta"
                      : "Esta unidade ainda não tem vínculo de anúncio para envio"
                  }
                />

                {isLoading ? <DocumentsTableSkeleton /> : null}
                {!isLoading && !errorMessage && !selectedFolderKey ? (
                  <DocumentsEmptyState
                    title="Selecione uma pasta"
                    description="Escolha Geral ou uma unidade na navegação para ver os documentos daquela pasta."
                  />
                ) : null}
                {!isLoading &&
                selectedFolderKey &&
                folderDocuments.length > 0 ? (
                  <DocumentsFiltersPanel
                    filters={filters}
                    onChange={updateFilters}
                    onReset={resetFilters}
                  />
                ) : null}
                {!isLoading &&
                !errorMessage &&
                selectedFolderKey &&
                folderDocuments.length > 0 &&
                visibleDocuments.length === 0 ? (
                  <DocumentsEmptyState
                    title="Nenhum documento corresponde aos filtros desta pasta"
                    description="Tente alterar origem, tipo, status, período ou busca."
                  />
                ) : null}
                {!isLoading &&
                !errorMessage &&
                selectedFolderKey &&
                folderDocuments.length === 0 ? (
                  <DocumentsEmptyState
                    title="Nenhum documento nesta pasta"
                    description="Envios manuais e documentos emitidos para esta pasta aparecerão aqui."
                  />
                ) : null}
                {!isLoading && visibleDocuments.length > 0 ? (
                  <DocumentsTable
                    documents={visibleDocuments}
                    isBusy={state.isDocumentActionBusy}
                    onDelete={state.setDocumentToDelete}
                    onDownload={state.downloadDocument}
                    onSelect={selectDocument}
                  />
                ) : null}
                {hasFilters ? (
                  <button
                    className="documents-clear-filters"
                    onClick={resetFilters}
                    type="button"
                  >
                    Limpar filtros
                  </button>
                ) : null}
              </>
            )}
          </section>
        </section>
      </main>

      {isMobileFiltersOpen ? (
        <div
          className="documents-modal-backdrop"
          onClick={() => setIsMobileFiltersOpen(false)}
        >
          <div
            className="documents-mobile-filters"
            onClick={(event) => event.stopPropagation()}
          >
            <DocumentsFolderNavigator
              documents={state.documents}
              isLoading={unitFolders.status === "loading"}
              onSelect={selectFolder}
              selectedKey={selectedFolderKey}
              vehicleOptions={vehicleOptions}
            />
          </div>
        </div>
      ) : null}

      {runtimeApi && uploadTarget ? (
        <DocumentUploadDialog
          api={runtimeApi}
          isOpen={state.isUploadDialogOpen}
          onClose={() => state.setIsUploadDialogOpen(false)}
          onUploaded={(uploadedDocuments) => {
            state.setDocuments((current) => [...uploadedDocuments, ...current]);
            state.setStatus({ kind: "ready" });
            void state.resetAndReload();
          }}
          target={uploadTarget}
        />
      ) : null}
      <DocumentManageLinksDialog
        document={linkDocument}
        isBusy={state.isDocumentActionBusy}
        onClose={() => setLinkDocument(null)}
        onSave={state.updateDocument}
        vehicleOptions={vehicleOptions}
      />
      <DocumentTemplatesDialog
        isOpen={isTemplatesDialogOpen}
        isSaving={state.isSavingTemplate}
        onClose={() => setIsTemplatesDialogOpen(false)}
        onSave={state.saveTemplate}
        templates={state.templates}
      />
      <DocumentDeleteDialog
        document={state.documentToDelete}
        isBusy={state.isDocumentActionBusy}
        onClose={() => state.setDocumentToDelete(null)}
        onConfirm={() => void state.deleteDocument()}
      />
    </div>
  );
}
