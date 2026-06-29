import { Info, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import type { InventoryDetailSelectionState } from "../model/listCatalogModel";

export function InventoryListSelectionStatus({
  state,
}: {
  state: InventoryDetailSelectionState;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel-branded p-5 flex flex-col gap-3"
    >
      <h4 className="text-xs font-black uppercase tracking-wider text-muted">
        Seleção de Veículo
      </h4>

      {state.kind === "idle" && (
        <div className="flex items-start gap-3 text-muted">
          <Info className="size-5 shrink-0 text-violet-500 mt-0.5" />
          <p className="text-sm font-bold leading-relaxed">
            Selecione um veículo para gerenciar workflow, fotos, custos e dados
            técnicos.
          </p>
        </div>
      )}

      {state.kind === "loading" && (
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="size-5 shrink-0 animate-spin text-accent" />
          <p className="text-sm font-black">Carregando detalhes do veículo.</p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex items-start gap-3 text-danger">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <p className="text-sm font-black leading-relaxed">{state.message}</p>
        </div>
      )}

      {state.kind === "ready" && (
        <div className="flex items-start gap-3 text-accent-strong">
          <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-accent" />
          <p className="text-sm font-black leading-relaxed">
            Veículo selecionado. Painel de edição disponível abaixo.
          </p>
        </div>
      )}
    </motion.div>
  );
}
