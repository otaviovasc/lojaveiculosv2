import { Download, FileSearch, Trash2, UploadCloud } from "lucide-react";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import {
  FeatureRowAction,
  FeatureRowActions,
} from "../../components/ui/FeatureTable";
import { MercosulPlateBadge } from "../inventory/components/InventoryListingCardGrid";
import { DocumentOriginBadge } from "./DocumentBadges";
import { documentVehicleInfo } from "./documentDisplayModel";
import type { DocumentsUploadListAction } from "./DocumentWorkspaceTable";
import {
  documentFileLabel,
  documentKindBadge,
  documentStatusTone,
  formatDateTime,
} from "./documentsWorkspaceModel";
import { statusLabel } from "./documentLabels";
import type { WorkspaceDocument } from "./types";

export function DocumentWorkspaceMobileList({
  documents,
  isBusy,
  onDelete,
  onDownload,
  onSelect,
  onToggleSelect,
  selectedIds,
  upload,
}: {
  documents: readonly WorkspaceDocument[];
  isBusy: boolean;
  onDelete: (document: WorkspaceDocument) => void;
  onDownload: (documentId: string) => Promise<void>;
  onSelect: (document: WorkspaceDocument) => void;
  onToggleSelect?: (documentId: string, next: boolean) => void;
  selectedIds?: ReadonlySet<string>;
  upload?: DocumentsUploadListAction;
}) {
  return (
    <ul
      aria-label="Documentos"
      className="grid gap-2 md:hidden"
      data-testid="documents-mobile-list"
    >
      {upload ? (
        <li>
          <button
            className="documents-upload-list-button"
            disabled={upload.disabled}
            onClick={upload.onClick}
            title={upload.title ?? upload.label}
            type="button"
          >
            <UploadCloud aria-hidden="true" className="size-4" />
            <span>{upload.label}</span>
            {upload.hint ? (
              <span className="documents-upload-list-button-hint">
                {upload.hint}
              </span>
            ) : null}
          </button>
        </li>
      ) : null}
      {documents.map((document) => {
        const isChecked = Boolean(selectedIds?.has(document.id));
        const vehicle = documentVehicleInfo(document);

        return (
          <li
            className={
              "rounded-xl border bg-panel p-3 shadow-sm transition-colors " +
              (isChecked ? "border-accent bg-accent-soft" : "border-line")
            }
            key={document.id}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {onToggleSelect ? (
                <input
                  aria-label={`Selecionar ${document.title}`}
                  checked={isChecked}
                  className="mt-1 size-4 shrink-0 cursor-pointer accent-accent"
                  disabled={isBusy}
                  onChange={(event) =>
                    onToggleSelect(document.id, event.target.checked)
                  }
                  type="checkbox"
                />
              ) : null}
              <button
                className="min-w-0 flex-1 cursor-pointer text-left"
                onClick={() => onSelect(document)}
                type="button"
              >
                <strong className="block truncate text-sm font-black text-app-text">
                  {document.title}
                </strong>
                <span className="mt-0.5 block truncate text-xs font-bold text-muted">
                  {document.file.fileName}
                </span>
              </button>
              <FeatureStatusBadge
                className="shrink-0 whitespace-nowrap text-xs"
                size="compact"
                tone={documentStatusTone(document.status)}
              >
                {statusLabel(document.status)}
              </FeatureStatusBadge>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line/60 pt-3 text-xs">
              <DocumentMobileField
                label="Tipo"
                value={documentKindBadge(document)}
              />
              <DocumentMobileField
                label="Enviado"
                value={formatDateTime(document.uploadedAt)}
              />
              <DocumentMobileField
                label="Arquivo"
                value={documentFileLabel(document)}
              />
              <DocumentMobileField
                label="Unidade"
                value={vehicle?.label ?? "Geral"}
              />
            </dl>

            <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <DocumentOriginBadge document={document} />
                {vehicle?.plate ? (
                  <MercosulPlateBadge plate={vehicle.plate} />
                ) : null}
              </div>
              <FeatureRowActions className="shrink-0">
                <FeatureRowAction
                  ariaLabel="Visualizar documento"
                  icon={FileSearch}
                  onClick={() => onSelect(document)}
                  tooltip="Visualizar"
                />
                <FeatureRowAction
                  ariaLabel="Baixar documento"
                  disabled={isBusy}
                  icon={Download}
                  onClick={() => void onDownload(document.id)}
                  tooltip="Baixar"
                />
                <FeatureRowAction
                  ariaLabel="Excluir documento"
                  disabled={isBusy || document.status === "voided"}
                  icon={Trash2}
                  onClick={() => onDelete(document)}
                  tooltip="Excluir"
                />
              </FeatureRowActions>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DocumentMobileField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-black uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-bold text-app-text">{value}</dd>
    </div>
  );
}
