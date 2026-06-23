import { Trash2, X } from "lucide-react";
import { motion } from "motion/react";
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
      <section
        aria-label="Excluir documento"
        className="glass-panel-branded documents-delete-dialog !p-6 relative overflow-hidden flex flex-col items-center text-center gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Fechar"
          className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-full border border-line bg-app-elevated text-muted hover:text-primary transition-all cursor-pointer"
          disabled={isBusy}
          onClick={onClose}
          title="Fechar"
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </motion.button>
        <div className="documents-delete-icon">
          <Trash2 aria-hidden="true" className="size-5" />
        </div>
        <strong>Excluir documento</strong>
        <p className="text-sm text-muted">
          O documento será cancelado e mantido no histórico auditado. Esta ação
          não pode ser desfeita.
        </p>
        <small className="font-bold text-accent-strong">{document.title}</small>
        <footer className="flex gap-3 w-full mt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-app px-4 text-sm font-bold text-app-text hover:bg-app-elevated transition-all cursor-pointer disabled:opacity-50"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 text-white font-bold text-sm cursor-pointer shadow-sm hover:bg-red-700 transition-all disabled:opacity-50"
            disabled={isBusy}
            onClick={onConfirm}
            type="button"
          >
            {isBusy ? "Excluindo..." : "Confirmar exclusão"}
          </motion.button>
        </footer>
      </section>
    </div>
  );
}
