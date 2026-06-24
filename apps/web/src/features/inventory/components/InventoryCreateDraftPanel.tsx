import { RotateCcw, Trash2 } from "lucide-react";
import type { InventoryCreateDraft } from "../model/inventoryCreateDraft";

export function InventoryCreateDraftPanel({
  draft,
  onClear,
  onContinue,
}: {
  draft: InventoryCreateDraft;
  onClear: () => void;
  onContinue: () => void;
}) {
  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(draft.updatedAt));

  return (
    <section className="rounded-xl border border-line bg-panel p-4 shadow-[var(--shadow-panel)] mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-wide text-app-text">
            Rascunho local encontrado
          </h3>
          <p className="text-xs font-bold text-muted">
            Última edição em {updatedAt}. Fotos selecionadas antes de recarregar
            precisam ser anexadas novamente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-black text-inverse"
            onClick={onContinue}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            <span>Continuar rascunho</span>
          </button>
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-app px-3 text-xs font-black text-app-text"
            onClick={onClear}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4 text-danger" />
            <span>Descartar</span>
          </button>
        </div>
      </div>
    </section>
  );
}
