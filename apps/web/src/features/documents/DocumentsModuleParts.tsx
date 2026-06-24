import { FileText, FolderOpen, RefreshCcw, UploadCloud } from "lucide-react";
import { EmptyCatalog } from "../inventory/components/InventoryListingCardGrid";

export function DocumentsTableSkeleton() {
  return (
    <div
      className="documents-table-skeleton"
      aria-label="Carregando documentos"
    >
      {Array.from({ length: 7 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function DocumentsListHeading({
  isUploadDisabled,
  isRefreshing,
  onOpenFolders,
  onOpenTemplates,
  onRefresh,
  onUpload,
  showUpload,
  subtitle,
  title,
  uploadTitle,
}: {
  isUploadDisabled: boolean;
  isRefreshing: boolean;
  onOpenFolders: () => void;
  onOpenTemplates: () => void;
  onRefresh: () => void;
  onUpload: () => void;
  showUpload: boolean;
  subtitle: string;
  title: string;
  uploadTitle: string;
}) {
  return (
    <div className="documents-list-heading">
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="documents-list-actions">
        <button
          className="documents-secondary-action documents-mobile-filter-action"
          onClick={onOpenFolders}
          type="button"
        >
          <FolderOpen aria-hidden="true" className="size-4" />
          Pastas
        </button>
        <button
          className="documents-secondary-action"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCcw
            aria-hidden="true"
            className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Atualizar
        </button>
        <button
          className="documents-secondary-action"
          onClick={onOpenTemplates}
          type="button"
        >
          <FileText aria-hidden="true" className="size-4" />
          Modelos
        </button>
        {showUpload ? (
          <button
            className="documents-primary-action"
            disabled={isUploadDisabled}
            onClick={onUpload}
            title={uploadTitle}
            type="button"
          >
            <UploadCloud aria-hidden="true" className="size-4" />
            Enviar documento
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function DocumentsEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return <EmptyCatalog body={description} title={title} />;
}
