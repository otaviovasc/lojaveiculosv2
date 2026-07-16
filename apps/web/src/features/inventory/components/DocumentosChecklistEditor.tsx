import { Plus, Trash2 } from "lucide-react";
import { FeatureSelect } from "../../../components/ui/FeatureControls";
import type {
  InventoryChecklist,
  InventoryChecklistItemStatus,
} from "../model/types";

type Props = {
  checklist: InventoryChecklist;
  disabled: boolean;
  newItemText: string;
  onAdd: () => void;
  onChangeNewItem: (value: string) => void;
  onDelete: (itemId: string) => void;
  onNotesChange: (itemId: string, notes: string | null) => void;
  onStatusChange: (
    itemId: string,
    status: InventoryChecklistItemStatus,
  ) => void;
  onToggle: (itemId: string) => void;
};

const statusOptions = [
  { label: "Pendente", value: "pending" },
  { label: "Aprovado", value: "passed" },
  { label: "Reprovado", value: "failed" },
  { label: "Dispensado", value: "waived" },
] as const;

export function DocumentosChecklistEditor({
  checklist,
  disabled,
  newItemText,
  onAdd,
  onChangeNewItem,
  onDelete,
  onNotesChange,
  onStatusChange,
  onToggle,
}: Props) {
  return (
    <>
      <div className="checklist-editor-list">
        {checklist.items.map((item) => (
          <div
            key={item.id}
            className="checklist-editor-item md:grid-cols-[minmax(0,1fr)_150px_auto]"
            data-status={item.status}
          >
            <div className="min-w-0">
              <label className="flex items-center gap-2.5 text-xs select-none">
                <input
                  checked={item.status === "passed" || item.status === "waived"}
                  className="checklist-item-checkbox"
                  disabled={disabled}
                  onChange={() => onToggle(item.id)}
                  type="checkbox"
                />
                <span className="font-bold text-app-text text-sm transition-colors duration-150">
                  {item.label}
                </span>
              </label>
              <input
                aria-label={`Observações de ${item.label}`}
                className="checklist-item-textarea mt-2"
                defaultValue={item.notes ?? ""}
                disabled={disabled}
                onBlur={(event) => {
                  const notes = event.target.value.trim() || null;
                  if (notes !== item.notes) onNotesChange(item.id, notes);
                }}
                placeholder="Adicionar observação..."
                type="text"
              />
            </div>
            <div className="self-center">
              <FeatureSelect
                ariaLabel={`Situação de ${item.label}`}
                density="compact"
                disabled={disabled}
                onChange={(status) => onStatusChange(item.id, status)}
                options={statusOptions}
                value={item.status}
              />
            </div>
            <button
              aria-label={`Excluir ${item.label}`}
              className="min-h-9 self-center rounded-lg bg-transparent p-2 text-muted transition-all hover:bg-danger hover:text-inverse disabled:cursor-not-allowed disabled:opacity-55"
              disabled={disabled || checklist.items.length === 1}
              onClick={() => onDelete(item.id)}
              title="Excluir item"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-line/45 pt-4 mt-2"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd();
        }}
      >
        <input
          aria-label="Novo item do checklist"
          className="min-h-[2.5rem] flex-1 rounded-lg border border-line bg-app px-3 text-xs font-bold outline-none placeholder:text-muted focus:border-line-strong focus:bg-panel focus:shadow-[var(--shadow-focus)] transition-all duration-150"
          disabled={disabled}
          onChange={(event) => onChangeNewItem(event.target.value)}
          placeholder="Adicionar novo item ao checklist..."
          type="text"
          value={newItemText}
        />
        <button
          aria-label="Adicionar item ao checklist"
          className="flex min-h-[2.5rem] shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-xs font-black text-accent-foreground hover:bg-accent-strong hover:text-accent-strong-foreground disabled:cursor-not-allowed disabled:opacity-55 transition-all duration-150"
          disabled={disabled || !newItemText.trim()}
          title="Adicionar item"
          type="submit"
        >
          <Plus aria-hidden="true" className="size-4 mr-1" />
          Adicionar
        </button>
      </form>
    </>
  );
}
