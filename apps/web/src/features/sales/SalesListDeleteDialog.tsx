import { AlertCircle, Trash2 } from "lucide-react";

export function SalesListDeleteDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
      <div className="bg-panel border border-line rounded-3xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-center items-center">
        <div className="size-14 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
          <Trash2 className="size-6" />
        </div>

        <div>
          <h3 className="text-sm font-black text-app-text uppercase tracking-wider">
            Confirmar Exclusão
          </h3>
          <p className="text-xs font-bold text-muted leading-relaxed mt-2">
            Tem certeza que deseja excluir este rascunho de venda?
            <br />
            Esta ação é irreversível e o rascunho será removido.
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-left text-xs font-bold text-amber-600 w-full">
          <span className="uppercase font-black flex items-center gap-1 mb-1">
            <AlertCircle className="size-3.5 shrink-0" /> Operação de Exclusão
          </span>
          <span>Apenas vendas em rascunho podem ser excluídas.</span>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full border-t border-line/40 pt-4 mt-2">
          <button
            className="sales-primary-button bg-rose-600 hover:bg-rose-700  !min-h-10 !h-10 text-xs uppercase"
            onClick={onConfirm}
            type="button"
          >
            <div className="gloss-overlay" />
            Excluir Venda
          </button>

          <button
            className="sales-secondary-button !min-h-10 !h-10 text-xs uppercase"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
