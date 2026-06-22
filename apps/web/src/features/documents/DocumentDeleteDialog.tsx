import { Trash2, X } from "lucide-react";
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
        className="documents-delete-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Fechar"
          disabled={isBusy}
          onClick={onClose}
          title="Fechar"
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
        <div className="documents-delete-icon">
          <Trash2 aria-hidden="true" className="size-5" />
        </div>
        <strong>Excluir documento</strong>
        <p>
          O documento sera cancelado e mantido no historico auditado. Esta acao
          nao pode ser desfeita.
        </p>
        <small>{document.title}</small>
        <footer>
          <button disabled={isBusy} onClick={onClose} type="button">
            Cancelar
          </button>
          <button disabled={isBusy} onClick={onConfirm} type="button">
            {isBusy ? "Excluindo..." : "Confirmar exclusao"}
          </button>
        </footer>
      </section>
    </div>
  );
}
