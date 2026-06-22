import { ArrowLeft, Folder, FolderOpen, List, Upload } from "lucide-react";
import { DocumentsTable } from "./DocumentWorkspaceTable";
import {
  filterDocumentsByFolder,
  formatDateTime,
  type DocumentFolder,
} from "./documentsWorkspaceModel";
import type { DocumentKind, WorkspaceDocument } from "./types";

export type WorkspaceViewMode = "folders" | "list";

export function DocumentWorkspacePanel({
  documents,
  folders,
  isBusy,
  isResultCapped,
  isLoading,
  onDownload,
  onOpenUpload,
  onSelect,
  onSelectFolder,
  onDelete,
  onUpdate,
  onViewModeChange,
  selectedFolderKey,
  viewMode,
}: {
  documents: readonly WorkspaceDocument[];
  folders: readonly DocumentFolder[];
  isBusy: boolean;
  isResultCapped: boolean;
  isLoading: boolean;
  onDownload: (documentId: string) => Promise<void>;
  onOpenUpload: () => void;
  onSelect: (document: WorkspaceDocument) => void;
  onSelectFolder: (folderKey: string | null) => void;
  onDelete: (document: WorkspaceDocument) => void;
  onUpdate: (
    document: WorkspaceDocument,
    input: { kind: DocumentKind; title: string },
  ) => Promise<void>;
  onViewModeChange: (mode: WorkspaceViewMode) => void;
  selectedFolderKey: string | null;
  viewMode: WorkspaceViewMode;
}) {
  const selectedFolder =
    folders.find((folder) => folder.key === selectedFolderKey) ?? null;
  const visibleDocuments =
    viewMode === "folders"
      ? filterDocumentsByFolder(documents, selectedFolderKey)
      : documents;

  return (
    <section className="documents-panel">
      <div className="documents-panel-title documents-workspace-title">
        <div>
          <strong>
            {viewMode === "folders"
              ? "Pastas de documentos"
              : "Lista operacional"}
          </strong>
          <span>
            {selectedFolder
              ? `${selectedFolder.title} · ${selectedFolder.count} ${isResultCapped ? "documentos carregados" : "documentos"}`
              : isResultCapped
                ? "Pastas e contagens refletem os documentos carregados mais recentes."
                : "Organize por veiculo, venda, lead, financeiro e fiscal."}
          </span>
        </div>
        <div className="documents-workspace-actions">
          <button
            className="documents-upload-action"
            disabled={isBusy}
            onClick={onOpenUpload}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Anexar
          </button>
          <div
            className="documents-mode-toggle"
            aria-label="Modo de visualizacao"
          >
            <button
              className={viewMode === "folders" ? "is-active" : ""}
              onClick={() => onViewModeChange("folders")}
              title="Ver pastas"
              type="button"
            >
              <Folder aria-hidden="true" className="size-4" />
              Pastas
            </button>
            <button
              className={viewMode === "list" ? "is-active" : ""}
              onClick={() => onViewModeChange("list")}
              title="Ver lista"
              type="button"
            >
              <List aria-hidden="true" className="size-4" />
              Lista
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <WorkspaceSkeleton />
      ) : viewMode === "folders" && !selectedFolderKey ? (
        <FoldersGrid
          folders={folders}
          isResultCapped={isResultCapped}
          onSelectFolder={onSelectFolder}
        />
      ) : (
        <>
          {selectedFolder ? (
            <button
              className="documents-back-button"
              onClick={() => onSelectFolder(null)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Todas as pastas
            </button>
          ) : null}
          <DocumentsTable
            documents={visibleDocuments}
            isBusy={isBusy}
            onDownload={onDownload}
            onDelete={onDelete}
            onSelect={onSelect}
            onUpdate={onUpdate}
          />
        </>
      )}
    </section>
  );
}

function FoldersGrid({
  folders,
  isResultCapped,
  onSelectFolder,
}: {
  folders: readonly DocumentFolder[];
  isResultCapped: boolean;
  onSelectFolder: (folderKey: string | null) => void;
}) {
  if (folders.length === 0) {
    return <p className="documents-empty">Nenhuma pasta encontrada.</p>;
  }

  return (
    <div className="documents-folder-grid">
      {folders.map((folder) => (
        <button
          className="documents-folder-card"
          key={folder.key}
          onClick={() => onSelectFolder(folder.key)}
          type="button"
        >
          <FolderOpen aria-hidden="true" className="size-5" />
          <strong>{folder.title}</strong>
          <span>{folder.subtitle}</span>
          <small>
            {folder.count} docs{isResultCapped ? " carregados" : ""} ·{" "}
            {folder.issued} emitidos · atualizado{" "}
            {formatDateTime(folder.latestAt)}
          </small>
        </button>
      ))}
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="documents-table">
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="documents-row documents-row-skeleton" key={index}>
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
