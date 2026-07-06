import { Download, FileSearch, Trash2 } from "lucide-react";
import {
  FeatureStatusBadge,
  type FeatureStatusTone,
} from "../../components/ui/FeatureStates";
import {
  FeatureRowAction,
  FeatureRowActions,
  FeatureTableFrame,
} from "../../components/ui/FeatureTable";
import { MercosulPlateBadge } from "../inventory/components/InventoryListingCardGrid";
import { DocumentOriginBadge } from "./DocumentBadges";
import { documentVehicleInfo } from "./documentDisplayModel";
import {
  documentFileLabel,
  documentKindBadge,
  documentStatusBadge,
  documentStatusTone,
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
    <FeatureTableFrame>
      <table className="min-w-[56rem] border-collapse text-left text-sm xl:min-w-full">
        <thead className="bg-app/80 text-xs font-black uppercase tracking-wider text-muted border-b border-line">
          <tr>
            {showSelect ? <th className="px-3 py-3.5 w-10" /> : null}
            <th className="px-4 py-3.5">Documento</th>
            <th className="hidden px-4 py-3.5 lg:table-cell">Origem</th>
            <th className="documents-table-wide-only px-4 py-3.5">Unidade</th>
            <th className="px-4 py-3.5">Tipo</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="documents-table-wide-only px-4 py-3.5">Enviado</th>
            <th className="hidden px-4 py-3.5 2xl:table-cell">Tamanho</th>
            <th className="sticky right-0 z-10 bg-panel px-4 py-3.5 text-right">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          {documents.map((document) => {
            const isChecked = Boolean(selectedIds?.has(document.id));
            const vehicle = documentVehicleInfo(document);

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
                <td className="px-4 py-3 max-w-[20rem] align-middle">
                  <div
                    className={
                      "truncate font-black text-sm text-app-text group-hover:text-accent transition-colors " +
                      (isChecked ? "text-accent-strong" : "")
                    }
                  >
                    {document.title}
                  </div>
                  <div className="truncate text-xs font-bold text-muted mt-0.5">
                    {document.file.fileName}
                  </div>
                </td>

                {/* Origem */}
                <td className="hidden px-4 py-3 whitespace-nowrap align-middle lg:table-cell">
                  <div className="flex items-center h-10">
                    <DocumentOriginBadge document={document} />
                  </div>
                </td>

                {/* Unidade (placa Mercosul) */}
                <td className="documents-table-wide-only px-4 py-3 whitespace-nowrap align-middle">
                  <div className="flex items-center h-10">
                    {vehicle?.plate ? (
                      <MercosulPlateBadge plate={vehicle.plate} />
                    ) : (
                      <span className="text-xs font-black uppercase tracking-wider text-muted">
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
                    <FeatureStatusBadge
                      tone={documentStatusTone(document.status)}
                    >
                      {statusLabel(document.status)}
                    </FeatureStatusBadge>
                  </div>
                </td>

                {/* Enviado */}
                <td className="documents-table-wide-only px-4 py-3 whitespace-nowrap text-xs align-middle">
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
                <td className="hidden px-4 py-3 whitespace-nowrap text-xs align-middle 2xl:table-cell">
                  <div className="font-bold text-muted">
                    {documentFileLabel(document)}
                  </div>
                </td>

                {/* Ações */}
                <td
                  className="sticky right-0 bg-panel px-4 py-3 whitespace-nowrap text-right align-middle group-hover:bg-app-elevated"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FeatureRowActions>
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </FeatureTableFrame>
  );
}
