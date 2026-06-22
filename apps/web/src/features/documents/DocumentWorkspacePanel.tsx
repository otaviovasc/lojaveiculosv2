import {
  ArrowLeft,
  Download,
  FileSearch,
  Folder,
  FolderOpen,
  List,
} from "lucide-react";
import {
  createFolderKey,
  documentContextLabel,
  documentFileLabel,
  documentKindBadge,
  documentPrimaryParty,
  documentStatusBadge,
  filterDocumentsByFolder,
  formatDateTime,
  type DocumentFolder,
} from "./documentsWorkspaceModel";
import type { WorkspaceDocument } from "./types";

export type WorkspaceViewMode = "folders" | "list";

export function DocumentWorkspacePanel({
  documents,
  folders,
  isBusy,
  isResultCapped,
  isLoading,
  onDownload,
  onSelect,
  onSelectFolder,
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
  onSelect: (document: WorkspaceDocument) => void;
  onSelectFolder: (folderKey: string | null) => void;
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
            {viewMode === "folders" ? "Pastas de documentos" : "Lista operacional"}
          </strong>
          <span>
            {selectedFolder
              ? `${selectedFolder.title} · ${selectedFolder.count} documentos`
              : isResultCapped
                ? "Pastas e contagens refletem os documentos carregados mais recentes."
              : "Organize por veiculo, venda, lead, financeiro e fiscal."}
          </span>
        </div>
        <div className="documents-mode-toggle" aria-label="Modo de visualizacao">
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

      {isLoading ? (
        <WorkspaceSkeleton />
      ) : viewMode === "folders" && !selectedFolderKey ? (
        <FoldersGrid folders={folders} onSelectFolder={onSelectFolder} />
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
            onSelect={onSelect}
          />
        </>
      )}
    </section>
  );
}

function FoldersGrid({
  folders,
  onSelectFolder,
}: {
  folders: readonly DocumentFolder[];
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
            {folder.count} docs · {folder.issued} emitidos · atualizado{" "}
            {formatDateTime(folder.latestAt)}
          </small>
        </button>
      ))}
    </div>
  );
}

function DocumentsTable({
  documents,
  isBusy,
  onDownload,
  onSelect,
}: {
  documents: readonly WorkspaceDocument[];
  isBusy: boolean;
  onDownload: (documentId: string) => Promise<void>;
  onSelect: (document: WorkspaceDocument) => void;
}) {
  if (documents.length === 0) {
    return <p className="documents-empty">Nenhum documento encontrado.</p>;
  }

  return (
    <div className="documents-table documents-rich-table">
      {documents.map((document) => (
        <article className="documents-row" key={document.id}>
          <button
            className="documents-row-main"
            onClick={() => onSelect(document)}
            type="button"
          >
            <div>
              <strong>{document.title}</strong>
              <small>{document.file.fileName}</small>
            </div>
            <span>{documentKindBadge(document)}</span>
            <span className={`documents-status status-${document.status}`}>
              {documentStatusBadge(document)}
            </span>
            <span>{documentContextLabel(document)}</span>
            <span>{documentPrimaryParty(document)}</span>
            <time dateTime={document.uploadedAt}>
              {formatDateTime(document.uploadedAt)}
            </time>
            <span>{documentFileLabel(document)}</span>
          </button>
          <div className="documents-row-actions">
            <button
              disabled={isBusy}
              onClick={() => onSelect(document)}
              title="Visualizar"
              type="button"
            >
              <FileSearch aria-hidden="true" className="size-4" />
            </button>
            <button
              disabled={isBusy}
              onClick={() => void onDownload(document.id)}
              title="Baixar"
              type="button"
            >
              <Download aria-hidden="true" className="size-4" />
            </button>
          </div>
        </article>
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
