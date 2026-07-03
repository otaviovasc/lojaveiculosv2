import { useState } from "react";
import { Plus, X, StickyNote } from "lucide-react";
import type {
  CreateProductCrmActivityInput,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
};

export function CrmLeadDetailsTabsNotas({
  lead,
  activities,
  onCreateActivity,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");

  const notes = activities.filter((a) => a.activityType === "note");

  const handleCreate = async () => {
    if (!content.trim()) return;
    await onCreateActivity(lead.id, {
      activityType: "note",
      content: content.trim(),
      direction: "internal",
    });
    setIsOpen(false);
    setContent("");
  };

  return (
    <div className="flex flex-col gap-4 text-app-text select-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-app-text">Notas</span>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-panel/10 px-3 text-xs font-bold text-app-text hover:bg-line/15 transition-colors cursor-pointer"
          type="button"
        >
          <Plus className="size-3.5" />
          <span>Nota</span>
        </button>
      </div>

      {notes.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <div
              key={n.id}
              className="p-3.5 bg-panel/10 border border-line/15 rounded-xl flex flex-col gap-1.5"
            >
              <span className="text-xs font-bold text-app-text leading-relaxed whitespace-pre-wrap">
                {n.content}
              </span>
              <span className="text-xs font-bold text-muted self-end mt-1">
                {new Date(n.occurredAt).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-line/35 bg-panel/5 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
          <StickyNote className="size-7 text-muted" />
          <span className="text-xs font-bold text-app-text">
            Nenhuma nota criada para este lead ainda.
          </span>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer mt-1"
            type="button"
          >
            Adicionar Nota
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line/30 rounded-xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-app-text">Nova Nota</h3>
              <button
                aria-label="Fechar nova nota"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-app-text transition-colors"
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-black uppercase text-muted">
                  Conteúdo
                </span>
                <textarea
                  className="min-h-[120px] p-3.5 rounded-lg border border-line/35 bg-app text-xs font-bold text-app-text outline-none focus:border-accent resize-none"
                  placeholder="Escreva sua nota aqui..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="h-9 px-4 text-xs font-bold text-muted hover:text-app-text border border-line bg-panel/10 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleCreate()}
                className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
