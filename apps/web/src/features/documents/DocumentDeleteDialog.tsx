import { Trash2, X } from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import type { WorkspaceDocument } from "./types";

export function DocumentDeleteDialog({
  document,
  isBusy,
  onClose,
  onConfirm,
}: {
  document: WorkspaceDocument | null;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!document) return null;

  return (
    <div
      className="documents-modal-backdrop"
      onClick={isBusy ? undefined : onClose}
    >
      <AnimatedContent distance={30} duration={0.4} ease="power2.out">
        <section
          aria-label="Excluir documento"
          className="glass-panel-branded documents-delete-dialog !p-6 relative overflow-hidden flex flex-col items-center text-center gap-4"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            aria-label="Fechar"
            className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-full border border-line bg-app-elevated text-muted hover:text-primary transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            disabled={isBusy}
            onClick={onClose}
            title="Fechar"
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
          <div className="documents-delete-icon">
            <Trash2 aria-hidden="true" className="size-5" />
          </div>
          <strong>Excluir documento</strong>
          <p className="text-sm text-muted">
            O documento será cancelado e mantido no histórico auditado. Esta
            ação não pode ser desfeita.
          </p>
          <small className="font-bold text-accent-strong">
            {document.title}
          </small>
          <footer className="flex gap-3 w-full mt-2">
            <button
              className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-app px-4 text-sm font-bold text-app-text hover:bg-app-elevated transition-all duration-200 hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50"
              disabled={isBusy}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 text-white font-bold text-sm cursor-pointer shadow-sm hover:bg-red-700 transition-all duration-200 hover:scale-102 active:scale-98 disabled:opacity-50"
              disabled={isBusy}
              onClick={onConfirm}
              type="button"
            >
              {isBusy ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          </footer>
        </section>
      </AnimatedContent>
    </div>
  );
}
