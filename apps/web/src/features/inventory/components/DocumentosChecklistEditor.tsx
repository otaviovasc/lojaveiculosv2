import { Plus, Trash2 } from "lucide-react";
import type { InventoryChecklist } from "../model/types";

type Props = {
  checklist: InventoryChecklist;
  disabled: boolean;
  newItemText: string;
  onAdd: () => void;
  onChangeNewItem: (value: string) => void;
  onDelete: (itemId: string) => void;
  onToggle: (itemId: string) => void;
};

export function DocumentosChecklistEditor({
  checklist,
  disabled,
  newItemText,
  onAdd,
  onChangeNewItem,
  onDelete,
  onToggle,
}: Props) {
  return (
    <>
      <div className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {checklist.items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-app/10"
          >
            <label className="flex items-center gap-2.5 text-xs">
              <input
                checked={item.status === "passed" || item.status === "waived"}
                className="size-4 cursor-pointer accent-accent"
                disabled={disabled}
                onChange={() => onToggle(item.id)}
                type="checkbox"
              />
              <span className="font-bold text-app-text">{item.label}</span>
            </label>
            <button
              aria-label={`Excluir ${item.label}`}
              className="rounded bg-transparent p-1 text-muted transition-colors hover:bg-danger/15 hover:text-danger disabled:cursor-not-allowed disabled:opacity-55"
              disabled={disabled || checklist.items.length === 1}
              onClick={() => onDelete(item.id)}
              title="Excluir item"
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-line/45 pt-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd();
        }}
      >
        <input
          aria-label="Novo item do checklist"
          className="min-h-9 flex-1 rounded-lg border border-line bg-app px-3 text-xs font-bold outline-none"
          disabled={disabled}
          onChange={(event) => onChangeNewItem(event.target.value)}
          placeholder="Novo item..."
          type="text"
          value={newItemText}
        />
        <button
          aria-label="Adicionar item ao checklist"
          className="flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-accent px-3.5 text-xs font-black text-inverse hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-55"
          disabled={disabled || !newItemText.trim()}
          title="Adicionar item"
          type="submit"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </form>
    </>
  );
}
