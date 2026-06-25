import { FileText, FolderOpen, RefreshCcw, UploadCloud } from "lucide-react";
import type { DocumentsFolderKey } from "./documentDisplayModel";

export function DocumentsWorkspaceTopBar({
  folderTitle,
  folderSubtitle,
  isRefreshing,
  isUploading,
  onOpenFolders,
  onOpenTemplates,
  onRefresh,
  onUpload,
  selectedKey,
  showUpload,
  unitLabel,
  uploadTitle,
}: {
  folderTitle: string;
  folderSubtitle: string;
  isRefreshing: boolean;
  isUploading: boolean;
  onOpenFolders: () => void;
  onOpenTemplates: () => void;
  onRefresh: () => void;
  onUpload: () => void;
  selectedKey: DocumentsFolderKey;
  showUpload: boolean;
  unitLabel: string | null;
  uploadTitle: string;
}) {
  return (
    <div className="documents-top-bar">
      <div className="documents-top-bar-titles">
        <div className="documents-top-bar-eyebrow">
          <span>Documentos</span>
          <span aria-hidden>·</span>
          <span>{folderSubtitle}</span>
        </div>
        <h1 className="documents-top-bar-title">{folderTitle}</h1>
        {unitLabel ? (
          <span className="documents-top-bar-chip">
            <FolderOpen aria-hidden="true" className="size-3.5" />
            {unitLabel}
          </span>
        ) : null}
      </div>

      <div
        className="documents-top-bar-actions"
        role="toolbar"
        aria-label="Ações do workspace"
      >
        <button
          className="documents-top-bar-action md:hidden"
          onClick={onOpenFolders}
          type="button"
        >
          <FolderOpen aria-hidden="true" className="size-4" />
          <span>Pastas</span>
        </button>
        <button
          className="documents-top-bar-action"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCcw
            aria-hidden="true"
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>Atualizar</span>
        </button>
        <button
          className="documents-top-bar-action"
          onClick={onOpenTemplates}
          type="button"
        >
          <FileText aria-hidden="true" className="size-4" />
          <span>Modelos</span>
        </button>
        {showUpload ? (
          <button
            className="documents-top-bar-action documents-top-bar-action--primary"
            disabled={isUploading}
            onClick={onUpload}
            title={uploadTitle}
            type="button"
          >
            <UploadCloud aria-hidden="true" className="size-4" />
            <span>Enviar documento</span>
          </button>
        ) : null}
      </div>

      <input
        aria-hidden
        className="documents-top-bar-sr-only"
        readOnly
        tabIndex={-1}
        type="hidden"
        value={selectedKey}
      />
    </div>
  );
}
