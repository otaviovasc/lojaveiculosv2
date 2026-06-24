import { ArrowLeft, FolderOpen, Upload } from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { DocumentsTable } from "./DocumentWorkspaceTable";
import {
  filterDocumentsByGroup,
  formatDateTime,
  type DocumentTopGroup,
} from "./documentsWorkspaceModel";
import type { WorkspaceDocument } from "./types";

export function DocumentWorkspacePanel({
  documents,
  topGroups,
  hasMore,
  isBusy,
  isLoading,
  isLoadingMore,
  onDownload,
  onOpenUpload,
  onSelect,
  onSelectFolder,
  onDelete,
  onLoadMore,
  selectedFolderKey,
}: {
  documents: readonly WorkspaceDocument[];
  topGroups: readonly DocumentTopGroup[];
  hasMore: boolean;
  isBusy: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  onDownload: (documentId: string) => Promise<void>;
  onOpenUpload: () => void;
  onSelect: (document: WorkspaceDocument) => void;
  onSelectFolder: (folderKey: string | null) => void;
  onDelete: (document: WorkspaceDocument) => void;
  onLoadMore: () => void;
  selectedFolderKey: string | null;
}) {
  const selectedGroup =
    topGroups.find((group) => group.key === selectedFolderKey) ?? null;
  const visibleDocuments = filterDocumentsByGroup(documents, selectedFolderKey);

  return (
    <AnimatedContent
      distance={30}
      duration={0.8}
      ease="power3.out"
      className="w-full"
    >
      <section className="glass-panel-branded documents-panel !p-6 relative overflow-hidden">
        <div className="documents-panel-title documents-workspace-title">
          <div>
            <strong>
              {selectedGroup ? selectedGroup.title : "Workspace de documentos"}
            </strong>
            <span>
              {selectedGroup
                ? `${selectedGroup.subtitle} · ${selectedGroup.count} ${hasMore ? "documentos carregados" : "documentos"}`
                : hasMore
                  ? "Grupos refletem os documentos carregados mais recentes."
                  : "Documentos da loja organizados por grupos estruturais."}
            </span>
          </div>
          <div className="documents-workspace-actions">
            <button
              className="documents-upload-action inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse cursor-pointer shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-75"
              disabled={isBusy}
              onClick={onOpenUpload}
              type="button"
            >
              <Upload aria-hidden="true" className="size-4" />
              Anexar
            </button>
          </div>
        </div>

        {isLoading ? (
          <WorkspaceSkeleton />
        ) : !selectedFolderKey ? (
          <GroupsGrid
            topGroups={topGroups}
            hasMore={hasMore}
            onSelectFolder={onSelectFolder}
          />
        ) : (
          <>
            <button
              className="documents-back-button inline-flex min-h-9 items-center gap-2 rounded-lg bg-accent-soft px-3 text-xs font-black text-accent-strong cursor-pointer border border-accent-soft/20 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => onSelectFolder(null)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              Voltar para visao geral
            </button>
            <DocumentsTable
              documents={visibleDocuments}
              isBusy={isBusy}
              onDownload={onDownload}
              onDelete={onDelete}
              onSelect={onSelect}
            />
            {hasMore && !isLoading ? (
              <div className="flex justify-center py-4">
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-soft px-6 text-sm font-black text-accent-strong disabled:opacity-70 cursor-pointer border border-accent-soft/20 shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
                  disabled={isLoadingMore}
                  onClick={onLoadMore}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    className={`size-4 ${isLoadingMore ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Carregar mais</span>
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </AnimatedContent>
  );
}

function GroupsGrid({
  topGroups,
  hasMore,
  onSelectFolder,
}: {
  topGroups: readonly DocumentTopGroup[];
  hasMore: boolean;
  onSelectFolder: (folderKey: string | null) => void;
}) {
  if (topGroups.length === 0) {
    return <p className="documents-empty">Nenhum grupo encontrado.</p>;
  }

  return (
    <div className="documents-top-groups-grid">
      {topGroups.map((group) => (
        <AnimatedContent
          key={group.key}
          distance={20}
          duration={0.6}
          ease="power2.out"
        >
          <button
            className="documents-folder-card cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:border-[var(--color-accent)] w-full text-left"
            onClick={() => onSelectFolder(group.key)}
            type="button"
          >
            <FolderOpen aria-hidden="true" className="size-5" />
            <strong>{group.title}</strong>
            <span>{group.subtitle}</span>
            <small>
              {group.count} docs{hasMore ? " carregados" : ""} · {group.issued}{" "}
              emitidos · atualizado {formatDateTime(group.latestAt)}
            </small>
          </button>
        </AnimatedContent>
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
