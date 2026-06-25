import { DocumentDetailPanel } from "./DocumentDetailPanel";
import { DocumentsEmptyState } from "./DocumentsEmptyState";
import { DocumentsListToolbar } from "./DocumentsListToolbar";
import { DocumentsTableSheetHeader } from "./DocumentsTableSheetHeader";
import { DocumentsTableSkeleton } from "./DocumentsModuleParts";
import { DocumentsTable } from "./DocumentWorkspaceTable";
import type { DocumentsApi } from "./apiClient";
import type { DocumentOriginFilter } from "./DocumentsKpiSummary";
import type { DocumentsSortKey } from "./documentWorkspaceFilters";
import type {
  DocumentVehicleOption,
  DocumentsFolderKey,
  DocumentsWorkspaceFilters,
} from "./documentDisplayModel";
import type {
  DocumentKind,
  DocumentStatus,
  UpdateDocumentInput,
  WorkspaceDocument,
} from "./types";
import type { useDocumentsBulkSelection } from "./useDocumentsBulkSelection";
import type { useDocumentsModuleState } from "./useDocumentsModuleState";

type DocumentsState = ReturnType<typeof useDocumentsModuleState>;
type DocumentsSelection = ReturnType<typeof useDocumentsBulkSelection>;

export type DocumentsWorkspaceBodyProps = {
  api: DocumentsApi | null;
  clearAllFilters: () => void;
  errorMessage: string | null;
  filters: DocumentsWorkspaceFilters;
  folderDocuments: readonly WorkspaceDocument[];
  hasActiveFilters: boolean;
  isLoading: boolean;
  onCloseDetail: () => void;
  onDownloadDocument: (id: string) => Promise<void>;
  onDownloadSelected: () => void;
  onKindChange: (value: DocumentKind | "") => void;
  onOriginSelect: (origin: DocumentOriginFilter) => void;
  onPreviewDocument: (id: string) => Promise<void>;
  onSearchChange: (value: string) => void;
  onSelectDocument: (document: WorkspaceDocument) => void;
  onSetDocumentToDelete: (document: WorkspaceDocument | null) => void;
  onSetFilter: <Key extends keyof DocumentsWorkspaceFilters>(
    key: Key,
    value: DocumentsWorkspaceFilters[Key],
  ) => void;
  onSetLinkDocument: (document: WorkspaceDocument | null) => void;
  onSortChange: (key: DocumentsSortKey) => void;
  onStatusChange: (value: DocumentStatus | "") => void;
  onUploadClick: () => void;
  originFilter: DocumentOriginFilter;
  search: string;
  selectedFolderKey: DocumentsFolderKey;
  showUpload: boolean;
  sortBy: DocumentsSortKey;
  sortedVisible: readonly WorkspaceDocument[];
  state: DocumentsState;
  selection: DocumentsSelection;
  updateDocument: (
    document: WorkspaceDocument,
    input: UpdateDocumentInput,
  ) => Promise<WorkspaceDocument | null>;
  visibleSelectedCount: number;
};

export function DocumentsWorkspaceBody(props: DocumentsWorkspaceBodyProps) {
  const {
    api,
    clearAllFilters,
    errorMessage,
    filters,
    folderDocuments,
    hasActiveFilters,
    isLoading,
    onCloseDetail,
    onDownloadDocument,
    onDownloadSelected,
    onKindChange,
    onOriginSelect,
    onPreviewDocument,
    onSearchChange,
    onSelectDocument,
    onSetDocumentToDelete,
    onSetFilter,
    onSetLinkDocument,
    onSortChange,
    onStatusChange,
    onUploadClick,
    originFilter,
    search,
    selectedFolderKey,
    showUpload,
    sortBy,
    sortedVisible,
    state,
    selection,
    updateDocument,
    visibleSelectedCount,
  } = props;

  return (
    <section className="documents-list-panel" aria-label="Lista de documentos">
      {state.selectedDocument ? (
        <DocumentDetailPanel
          document={state.selectedDocument}
          isBusy={state.isDocumentActionBusy}
          onClose={onCloseDetail}
          onDelete={onSetDocumentToDelete}
          onDownload={onDownloadDocument}
          onManageLinks={onSetLinkDocument}
          onPreview={onPreviewDocument}
          onRegenerate={async (documentId) => {
            await state.applyDocumentAction(() =>
              api!.regenerateDocument(documentId),
            );
          }}
          onUpdate={updateDocument}
          preview={state.documentPreview}
          versions={state.documentVersions}
        />
      ) : (
        <>
          {isLoading ? <DocumentsTableSkeleton /> : null}
          {!isLoading && !errorMessage ? (
            <DocumentsListToolbar
              activeOrigin={originFilter}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              hasActiveFilters={hasActiveFilters || originFilter !== "all"}
              isLoading={isLoading}
              kind={filters.kind}
              onClearFilters={clearAllFilters}
              onDateFromChange={(value) => onSetFilter("dateFrom", value)}
              onDateToChange={(value) => onSetFilter("dateTo", value)}
              onKindChange={onKindChange}
              onOriginSelect={onOriginSelect}
              onSearchChange={onSearchChange}
              onSortChange={onSortChange}
              onStatusChange={onStatusChange}
              search={search}
              sortBy={sortBy}
              status={filters.status}
            />
          ) : null}
          {!isLoading && !errorMessage && folderDocuments.length === 0 ? (
            <DocumentsEmptyState
              {...(showUpload
                ? {
                    ctaLabel: "Enviar primeiro documento",
                    onAction: onUploadClick,
                  }
                : {})}
              kind="folder-empty"
              message={
                selectedFolderKey === "general"
                  ? "Nenhum documento na pasta Geral. Envios manuais e documentos emitidos sem vinculo aparecerao aqui."
                  : "Esta unidade ainda nao tem documentos. Use o botao Enviar para adicionar."
              }
              title={
                selectedFolderKey === "general"
                  ? "Pasta Geral vazia"
                  : "Unidade sem documentos"
              }
            />
          ) : null}
          {!isLoading &&
          !errorMessage &&
          folderDocuments.length > 0 &&
          sortedVisible.length === 0 ? (
            <DocumentsEmptyState
              ctaLabel="Limpar filtros"
              kind="no-results"
              message="Nenhum documento corresponde aos filtros desta pasta. Tente alterar origem, status, tipo, periodo ou busca."
              onAction={clearAllFilters}
              title="Sem resultados para os filtros"
            />
          ) : null}
          {!isLoading && sortedVisible.length > 0 ? (
            <>
              <DocumentsTableSheetHeader
                allSelected={
                  visibleSelectedCount > 0 &&
                  visibleSelectedCount === sortedVisible.length
                }
                disabled={isLoading}
                indeterminate={
                  visibleSelectedCount > 0 &&
                  visibleSelectedCount < sortedVisible.length
                }
                isDownloading={isLoading}
                onDeselectAll={selection.clear}
                onDownloadSelected={onDownloadSelected}
                onToggle={selection.toggleAll}
                selectedCount={visibleSelectedCount}
                totalCount={sortedVisible.length}
              />
              <DocumentsTable
                documents={sortedVisible}
                isBusy={state.isDocumentActionBusy}
                onDelete={onSetDocumentToDelete}
                onDownload={onDownloadDocument}
                onSelect={onSelectDocument}
                onToggleSelect={selection.toggle}
                selectedIds={selection.selectedIds}
              />
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
