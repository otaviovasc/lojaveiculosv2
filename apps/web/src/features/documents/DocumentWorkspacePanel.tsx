import { ArrowLeft, Folder, FolderOpen, List, Upload } from "lucide-react";
import { motion } from "motion/react";
import { DocumentsTable } from "./DocumentWorkspaceTable";
import {
  filterDocumentsByFolder,
  formatDateTime,
  type DocumentFolder,
} from "./documentsWorkspaceModel";
import type { DocumentKind, WorkspaceDocument } from "./types";

export type WorkspaceViewMode = "folders" | "list";

const modeToggleBase =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-black cursor-pointer border transition-all";
const selectedModeToggleClass =
  "bg-accent-soft text-accent-strong border-accent-soft/20";
const idleModeToggleClass =
  "bg-app border-line text-muted hover:text-primary hover:border-line-strong";

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
    <section className="glass-panel-branded documents-panel !p-6 relative overflow-hidden">
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
                : "Organize por veículo, venda, lead, financeiro e fiscal."}
          </span>
        </div>
        <div className="documents-workspace-actions">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="documents-upload-action inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse cursor-pointer shadow-sm disabled:opacity-75"
            disabled={isBusy}
            onClick={onOpenUpload}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Anexar
          </motion.button>
          <div
            className="documents-mode-toggle"
            aria-label="Modo de visualizacao"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={[
                modeToggleBase,
                viewMode === "folders"
                  ? selectedModeToggleClass
                  : idleModeToggleClass,
              ].join(" ")}
              onClick={() => onViewModeChange("folders")}
              title="Ver pastas"
              type="button"
            >
              <Folder aria-hidden="true" className="size-4" />
              Pastas
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={[
                modeToggleBase,
                viewMode === "list"
                  ? selectedModeToggleClass
                  : idleModeToggleClass,
              ].join(" ")}
              onClick={() => onViewModeChange("list")}
              title="Ver lista"
              type="button"
            >
              <List aria-hidden="true" className="size-4" />
              Lista
            </motion.button>
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
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="documents-back-button inline-flex min-h-9 items-center gap-2 rounded-lg bg-accent-soft px-3 text-xs font-black text-accent-strong cursor-pointer border border-accent-soft/20 shadow-sm"
              onClick={() => onSelectFolder(null)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Todas as pastas
            </motion.button>
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
        <motion.button
          whileHover={{
            y: -3,
            scale: 1.015,
            borderColor: "var(--color-accent)",
          }}
          whileTap={{ scale: 0.99 }}
          className="documents-folder-card cursor-pointer transition-all duration-200"
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
        </motion.button>
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
