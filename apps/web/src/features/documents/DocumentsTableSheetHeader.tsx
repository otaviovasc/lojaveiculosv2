import { Check, Download, Minus, X } from "lucide-react";

/**
 * Sheet-style header that sits at the top-left of the documents table.
 * Mirrors the "Select all" pattern used in other app sheets/dialogs where
 * the bulk-select affordance lives at position (0, 0) of the list.
 *
 * The counter switches between "0 de X" (nothing selected) and "N de X"
 * (N selected) so the user can always see exactly how many of the visible
 * documents are part of the current bulk action. When the user has at
 * least one row selected, the clear and download actions appear in the
 * same row as the checkbox so all selection affordances are co-located.
 */
export function DocumentsTableSheetHeader({
  allSelected,
  disabled,
  indeterminate,
  isDownloading,
  onDeselectAll,
  onDownloadSelected,
  onToggle,
  selectedCount,
  totalCount,
}: {
  allSelected: boolean;
  disabled: boolean;
  indeterminate: boolean;
  isDownloading: boolean;
  onDeselectAll: () => void;
  onDownloadSelected: () => void;
  onToggle: (next: boolean) => void;
  selectedCount: number;
  totalCount: number;
}) {
  const state: "checked" | "indeterminate" | "unchecked" = allSelected
    ? "checked"
    : indeterminate
      ? "indeterminate"
      : "unchecked";
  const countLabel =
    selectedCount > 0
      ? `${selectedCount} de ${totalCount} documentos`
      : `0 de ${totalCount} documentos`;
  const hasSelection = selectedCount > 0;
  return (
    <div
      className="documents-table-sheet-header"
      data-has-selection={hasSelection ? "true" : "false"}
      role="group"
      aria-label="Selecao rapida de documentos"
    >
      <div className="documents-table-sheet-header-start">
        <button
          aria-checked={
            state === "checked"
              ? "true"
              : state === "indeterminate"
                ? "mixed"
                : "false"
          }
          aria-label="Selecionar todos os documentos visiveis"
          className="documents-table-sheet-header-checkbox"
          disabled={disabled}
          onClick={() => onToggle(state !== "checked")}
          role="checkbox"
          type="button"
        >
          <span
            aria-hidden="true"
            className="documents-table-sheet-header-checkbox-box"
          >
            {state === "checked" ? <Check className="size-3" /> : null}
            {state === "indeterminate" ? <Minus className="size-3" /> : null}
          </span>
        </button>
        <span className="documents-table-sheet-header-label">
          Selecionar tudo
        </span>
        <span className="documents-table-sheet-header-count">{countLabel}</span>
      </div>

      {hasSelection ? (
        <div
          className="documents-table-sheet-header-actions"
          role="toolbar"
          aria-label="Ações da seleção"
        >
          <span className="documents-table-sheet-header-pill">
            {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
          </span>
          <button
            aria-label="Limpar selecao"
            className="documents-table-sheet-header-icon-button"
            onClick={onDeselectAll}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
          <button
            className="documents-table-sheet-header-download"
            disabled={isDownloading}
            onClick={onDownloadSelected}
            type="button"
          >
            <Download aria-hidden="true" className="size-3.5" />
            <span>Baixar</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
