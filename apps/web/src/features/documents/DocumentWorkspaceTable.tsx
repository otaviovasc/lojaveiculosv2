import {
  Bot,
  CarFront,
  Download,
  FileSearch,
  FolderArchive,
  Layers3,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { ReactNode } from "react";
import { MercosulPlateBadge } from "../inventory/components/InventoryListingCardGrid";
import {
  documentActorLabel,
  documentOrigin,
  documentOriginLabel,
  documentScope,
  documentScopeLabel,
  documentVehicleInfo,
} from "./documentDisplayModel";
import {
  documentFileLabel,
  documentKindBadge,
  documentStatusBadge,
  formatDateTime,
} from "./documentsWorkspaceModel";
import type { WorkspaceDocument } from "./types";

export function DocumentsTable({
  documents,
  isBusy,
  onDelete,
  onDownload,
  onSelect,
  selectedDocumentId = null,
}: {
  documents: readonly WorkspaceDocument[];
  isBusy: boolean;
  onDelete: (document: WorkspaceDocument) => void;
  onDownload: (documentId: string) => Promise<void>;
  onSelect: (document: WorkspaceDocument) => void;
  selectedDocumentId?: string | null;
}) {
  if (documents.length === 0) return null;

  return (
    <div className="documents-list">
      {documents.map((document) => {
        const isSelected = selectedDocumentId === document.id;

        return (
          <article
            className={
              isSelected
                ? "documents-list-item is-selected"
                : "documents-list-item"
            }
            key={document.id}
          >
            <button
              className="documents-list-main"
              onClick={() => onSelect(document)}
              type="button"
            >
              <div className="documents-list-title">
                <strong>{document.title}</strong>
                <span>{document.file.fileName}</span>
              </div>

              <div className="documents-list-badges">
                <DocumentOriginBadge document={document} />
                <DocumentScopeBadge document={document} />
                <span className={`documents-status status-${document.status}`}>
                  {documentStatusBadge(document)}
                </span>
              </div>

              <div className="documents-list-meta">
                <DocumentUnitMeta document={document} />
                <span>{documentKindBadge(document)}</span>
                <time dateTime={document.uploadedAt}>
                  {formatDateTime(document.uploadedAt)}
                </time>
                <span>{documentActorLabel(document)}</span>
                <span>{documentFileLabel(document)}</span>
              </div>
            </button>

            <div className="documents-row-actions">
              <IconAction
                disabled={isBusy}
                icon={<FileSearch aria-hidden="true" className="size-4" />}
                label="Visualizar documento"
                onClick={() => onSelect(document)}
              />
              <IconAction
                disabled={isBusy}
                icon={<Download aria-hidden="true" className="size-4" />}
                label="Baixar documento"
                onClick={() => void onDownload(document.id)}
              />
              <IconAction
                disabled={isBusy || document.status === "voided"}
                icon={<Trash2 aria-hidden="true" className="size-4" />}
                label="Excluir documento"
                onClick={() => onDelete(document)}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DocumentUnitMeta({ document }: { document: WorkspaceDocument }) {
  const vehicle = documentVehicleInfo(document);
  if (!vehicle) return <span>Geral</span>;

  return (
    <span className="documents-unit-meta">
      {vehicle.plate ? <MercosulPlateBadge plate={vehicle.plate} /> : null}
      <span>{[vehicle.label, vehicle.vin].filter(Boolean).join(" · ")}</span>
    </span>
  );
}

export function DocumentOriginBadge({
  document,
}: {
  document: WorkspaceDocument;
}) {
  const origin = documentOrigin(document);
  const Icon = origin === "manual" ? UploadCloud : Bot;
  return (
    <span className={`documents-origin-badge origin-${origin}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {documentOriginLabel(document)}
    </span>
  );
}

export function DocumentScopeBadge({
  document,
}: {
  document: WorkspaceDocument;
}) {
  const scope = documentScope(document);
  const Icon =
    scope === "multiple_vehicles"
      ? Layers3
      : scope === "vehicle"
        ? CarFront
        : FolderArchive;
  return (
    <span className={`documents-scope-badge scope-${scope}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {documentScopeLabel(document)}
    </span>
  );
}

function IconAction({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="documents-icon-button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}
