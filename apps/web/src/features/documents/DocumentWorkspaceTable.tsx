import { Download, FileSearch, Trash2 } from "lucide-react";
import { MercosulPlateBadge } from "../inventory/components/InventoryListingCardGrid";
import { documentOrigin, documentVehicleInfo } from "./documentDisplayModel";
import {
  documentFileLabel,
  documentKindBadge,
  documentStatusBadge,
  formatDateTime,
} from "./documentsWorkspaceModel";
import { kindLabel, statusLabel } from "./documentLabels";
import type { DocumentStatus } from "./types";
import type { WorkspaceDocument } from "./types";

export function DocumentsTable({
  documents,
  isBusy,
  onDelete,
  onDownload,
  onSelect,
  onToggleSelect,
  selectedIds,
}: {
  documents: readonly WorkspaceDocument[];
  isBusy: boolean;
  onDelete: (document: WorkspaceDocument) => void;
  onDownload: (documentId: string) => Promise<void>;
  onSelect: (document: WorkspaceDocument) => void;
  onToggleSelect?: (documentId: string, next: boolean) => void;
  selectedIds?: ReadonlySet<string>;
}) {
  if (documents.length === 0) return null;
  const showSelect = Boolean(onToggleSelect);

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-panel/40 backdrop-blur-md shadow-sm">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-app/80 text-[10px] font-black uppercase tracking-wider text-muted border-b border-line">
          <tr>
            {showSelect ? <th className="px-3 py-3.5 w-10" /> : null}
            <th className="px-4 py-3.5">Documento</th>
            <th className="px-4 py-3.5">Origem</th>
            <th className="px-4 py-3.5">Unidade</th>
            <th className="px-4 py-3.5">Tipo</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5">Enviado</th>
            <th className="px-4 py-3.5">Tamanho</th>
            <th className="px-4 py-3.5 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          {documents.map((document) => {
            const isChecked = Boolean(selectedIds?.has(document.id));
            const vehicle = documentVehicleInfo(document);
            const origin = documentOrigin(document);

            return (
              <tr
                className={
                  "group cursor-pointer hover:bg-line/20 transition-all duration-150 " +
                  (isChecked ? "bg-accent-soft" : "")
                }
                key={document.id}
                onClick={() => onSelect(document)}
              >
                {showSelect ? (
                  <td
                    className="px-3 py-3 whitespace-nowrap align-middle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      aria-label={`Selecionar ${document.title}`}
                      checked={isChecked}
                      className="size-4 accent-accent cursor-pointer"
                      disabled={isBusy}
                      onChange={(event) =>
                        onToggleSelect?.(document.id, event.target.checked)
                      }
                      type="checkbox"
                    />
                  </td>
                ) : null}

                {/* Documento */}
                <td className="px-4 py-3 max-w-[280px] align-middle">
                  <div
                    className={
                      "truncate font-black text-sm text-app-text group-hover:text-accent transition-colors " +
                      (isChecked ? "text-accent-strong" : "")
                    }
                  >
                    {document.title}
                  </div>
                  <div className="truncate text-[10px] font-bold text-muted mt-0.5">
                    {document.file.fileName}
                  </div>
                </td>

                {/* Origem */}
                <td className="px-4 py-3 whitespace-nowrap align-middle">
                  <div className="flex items-center h-10">
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider " +
                        (origin === "manual"
                          ? "bg-pink-500/10 text-pink-500 border border-pink-500/20"
                          : "bg-violet-500/10 text-violet-500 border border-violet-500/20")
                      }
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {origin === "manual" ? "Manual" : "Automatico"}
                    </span>
                  </div>
                </td>

                {/* Unidade (placa Mercosul) */}
                <td className="px-4 py-3 whitespace-nowrap align-middle">
                  <div className="flex items-center h-10">
                    {vehicle?.plate ? (
                      <MercosulPlateBadge plate={vehicle.plate} />
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                        Geral
                      </span>
                    )}
                  </div>
                </td>

                {/* Tipo */}
                <td className="px-4 py-3 whitespace-nowrap align-middle">
                  <div className="flex items-center h-10">
                    <span className="text-xs font-bold text-app-text">
                      {documentKindBadge(document)}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap align-middle">
                  <div className="flex items-center h-10">
                    <StatusBadge status={document.status} />
                  </div>
                </td>

                {/* Enviado */}
                <td className="px-4 py-3 whitespace-nowrap text-xs align-middle">
                  <div className="font-black text-app-text">
                    {formatDateTime(document.uploadedAt)}
                  </div>
                  {vehicle?.label ? (
                    <div className="text-muted mt-0.5 font-bold truncate max-w-[140px]">
                      {vehicle.label}
                    </div>
                  ) : null}
                </td>

                {/* Tamanho */}
                <td className="px-4 py-3 whitespace-nowrap text-xs align-middle">
                  <div className="font-bold text-muted">
                    {documentFileLabel(document)}
                  </div>
                </td>

                {/* Ações */}
                <td
                  className="px-4 py-3 whitespace-nowrap text-right align-middle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-2 h-10">
                    <RowAction
                      ariaLabel="Visualizar documento"
                      iconClass="text-blue-500"
                      Icon={FileSearch}
                      onClick={() => onSelect(document)}
                      tooltip="Visualizar"
                    />
                    <RowAction
                      ariaLabel="Baixar documento"
                      disabled={isBusy}
                      iconClass="text-emerald-500"
                      Icon={Download}
                      onClick={() => void onDownload(document.id)}
                      tooltip="Baixar"
                    />
                    <RowAction
                      ariaLabel="Excluir documento"
                      disabled={isBusy || document.status === "voided"}
                      iconClass="text-pink-500"
                      Icon={Trash2}
                      onClick={() => onDelete(document)}
                      tooltip="Excluir"
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const tone =
    status === "issued" || status === "signed"
      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
      : status === "pending_signature"
        ? "bg-warning/10 text-warning border border-warning/20"
        : status === "voided"
          ? "bg-pink-500/10 text-pink-500 border border-pink-500/20"
          : status === "draft"
            ? "bg-violet-500/10 text-violet-500 border border-violet-500/20"
            : "bg-panel text-muted border border-line";
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider " +
        tone
      }
    >
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

function RowAction({
  ariaLabel,
  disabled,
  iconClass,
  Icon,
  onClick,
  tooltip,
}: {
  ariaLabel: string;
  disabled?: boolean;
  iconClass: string;
  Icon: typeof FileSearch;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <div className="relative flex items-center">
      <button
        aria-label={ariaLabel}
        className="peer p-1.5 rounded-lg bg-app-elevated border border-line text-muted hover:bg-accent-soft hover:text-accent-strong transition-all cursor-pointer shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <Icon aria-hidden="true" className={"size-3.5 " + iconClass} />
      </button>
      <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 hidden peer-hover:block z-30 bg-gray-900 text-white text-[9px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap leading-none pointer-events-none border border-white/10">
        {tooltip}
        <div className="absolute left-full top-1/2 -translate-y-1/2 border-[4px] border-transparent border-l-gray-900" />
      </div>
    </div>
  );
}
