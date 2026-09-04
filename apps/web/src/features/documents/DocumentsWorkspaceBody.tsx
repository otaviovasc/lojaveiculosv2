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
  isLoadingMore: boolean;
  loadedDocumentCount: number;
  onCloseDetail: () => void;
  onDownloadDocument: (id: string) => Promise<void>;
  onDownloadSelected: () => void;
  onKindChange: (value: DocumentKind | "") => void;
  onLoadMore: () => void;
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
  paginationError: string | null;
  search: string;
  selectedFolderKey: DocumentsFolderKey;
  showUpload: boolean;
  sortBy: DocumentsSortKey;
  sortedVisible: readonly WorkspaceDocument[];
  state: DocumentsState;
  totalDocumentCount: number;
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
    isLoadingMore,
    loadedDocumentCount,
    onCloseDetail,
    onDownloadDocument,
    onDownloadSelected,
    onKindChange,
    onLoadMore,
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
    paginationError,
    search,
    selectedFolderKey,
    showUpload,
    sortBy,
    sortedVisible,
    state,
    totalDocumentCount,
    selection,
    updateDocument,
    visibleSelectedCount,
  } = props;

  return (
    <section className="documents-list-panel" aria-label="Lista de documentos">
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
      {!isLoading &&
      !errorMessage &&
      loadedDocumentCount >= totalDocumentCount &&
      folderDocuments.length === 0 ? (
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
              ? "Nenhum documento na pasta Geral. Envios manuais e documentos emitidos sem vínculo aparecerão aqui."
              : "Esta unidade ainda não tem documentos. Use o botão Enviar para adicionar."
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
      loadedDocumentCount >= totalDocumentCount &&
      folderDocuments.length > 0 &&
      sortedVisible.length === 0 ? (
        <DocumentsEmptyState
          ctaLabel="Limpar filtros"
          kind="no-results"
          message="Nenhum documento corresponde aos filtros desta pasta. Tente alterar origem, status, tipo, período ou busca."
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
            {...(showUpload
              ? {
                  upload: {
                    disabled: !api,
                    hint: "PDFs ou imagens salvos nesta pasta",
                    label: "Enviar documento",
                    onClick: onUploadClick,
                  },
                }
              : {})}
          />
        </>
      ) : null}

      {!isLoading && loadedDocumentCount < totalDocumentCount ? (
        <div
          aria-label="Paginação de documentos"
          className="flex flex-col items-center gap-2 rounded-xl border border-line bg-panel p-4 text-center"
        >
          <p className="text-sm font-semibold text-text tabular-nums">
            {loadedDocumentCount} de {totalDocumentCount} documentos carregados
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-muted">
            A busca e os filtros já consideram todo o acervo desta pasta. Esta
            lista mostra a página carregada; carregue mais para ver os demais
            resultados.
          </p>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line-strong bg-app-elevated px-4 text-sm font-bold text-text transition-colors hover:bg-accent-soft hover:text-accent-strong disabled:cursor-wait disabled:opacity-70"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type="button"
          >
            {isLoadingMore ? "Carregando documentos..." : "Carregar mais"}
          </button>
          {paginationError ? (
            <p className="text-sm font-semibold text-danger" role="alert">
              {paginationError}
            </p>
          ) : null}
        </div>
      ) : null}

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
          previewError={state.documentPreviewError}
          versions={state.documentVersions}
        />
      ) : null}
    </section>
  );
}
