import { useState } from "react";
import { ClipboardCheck, RotateCcw, Plus, Trash2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export function DocumentosChecklistCard() {
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: "chk-1", label: "Documentação em dia", checked: true },
    { id: "chk-2", label: "Chave reserva", checked: true },
    { id: "chk-3", label: "Manual do proprietário", checked: true },
    { id: "chk-4", label: "Pneus em bom estado", checked: false },
    { id: "chk-5", label: "Higienização interna/externa", checked: false },
    { id: "chk-6", label: "Revisão mecânica", checked: false },
    { id: "chk-7", label: "Funilaria/pintura OK", checked: false },
  ]);

  const [newItemText, setNewItemText] = useState("");

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;

    const newItem: ChecklistItem = {
      id: "item-" + Date.now(),
      label: text,
      checked: false,
    };
    setItems((prev) => [...prev, newItem]);
    setNewItemText("");
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    setItems((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  const completedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck className="size-4.5 text-accent shrink-0" />
          <h3 className="text-sm font-black uppercase tracking-wider">
            Checklist de Entrega
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted font-black">
            {completedCount}/{totalCount} Concluídos
          </span>
          <button
            onClick={handleReset}
            className="p-1 rounded bg-transparent hover:bg-line/25 text-muted hover:text-accent cursor-pointer transition-all"
            title="Resetar checklist"
            type="button"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1">
        <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist List */}
      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto mt-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-app/10 transition-colors group"
          >
            <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => handleToggle(item.id)}
                className="size-4 rounded border-line text-accent focus:ring-accent accent-accent cursor-pointer animate-none"
              />
              <span
                className={
                  "font-bold transition-all " +
                  (item.checked ? "text-muted line-through" : "text-app-text")
                }
              >
                {item.label}
              </span>
            </label>
            <button
              onClick={() => handleDeleteItem(item.id)}
              className="p-1 rounded bg-transparent hover:bg-danger/15 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Excluir item"
              type="button"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Item */}
      <form
        onSubmit={handleAddItem}
        className="flex gap-2 items-center border-t border-line/45 pt-3.5 mt-1"
      >
        <input
          type="text"
          placeholder="Novo item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          className="min-h-9 flex-1 rounded-lg border border-line bg-app px-3 text-xs font-bold outline-none"
        />
        <button
          type="submit"
          className="min-h-9 px-3.5 bg-accent text-inverse font-black text-xs hover:bg-accent-strong rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Plus className="size-4" />
        </button>
      </form>
    </div>
  );
}
