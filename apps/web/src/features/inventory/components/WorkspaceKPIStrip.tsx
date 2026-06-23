import { Briefcase, Shield } from "lucide-react";

export function WorkspaceKPIStrip({
  salePrice,
  acquisitionPrice,
  margin,
  stockTime,
  renaveStatus,
  isFinancingActive,
  isInsuranceActive,
  onFinancingToggle,
  onInsuranceToggle,
}: {
  salePrice: string;
  acquisitionPrice: string;
  margin: string;
  stockTime: string;
  renaveStatus: string;
  isFinancingActive: boolean;
  isInsuranceActive: boolean;
  onFinancingToggle: () => void;
  onInsuranceToggle: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center bg-panel/30 border border-line/60 rounded-2xl p-4.5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4.5 flex-1 min-w-0">
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Preço de Venda
          </span>
          <span className="block text-base font-black text-accent-strong mt-0.5">
            {salePrice}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Valor de Aquisição
          </span>
          <span className="block text-base font-black mt-0.5 text-app-text">
            {acquisitionPrice}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Margem Estimada
          </span>
          <span className="block text-base font-black text-emerald-500 mt-0.5">
            {margin}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Tempo em Pátio
          </span>
          <span className="block text-base font-black text-violet-500 mt-0.5">
            {stockTime}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-wider text-muted">
            Status RENAVE
          </span>
          <span className="block text-base font-black text-blue-500 mt-0.5">
            {renaveStatus}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-line/60 pt-4 lg:pt-0 lg:pl-6 shrink-0">
        <button
          onClick={onFinancingToggle}
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer border " +
            (isFinancingActive
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
              : "bg-app-elevated text-app-text hover:bg-line/25 border-line")
          }
          type="button"
        >
          <Briefcase className="size-3.5" />
          <span>Financiamento</span>
        </button>
        <button
          onClick={onInsuranceToggle}
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer border " +
            (isInsuranceActive
              ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
              : "bg-app-elevated text-app-text hover:bg-line/25 border-line")
          }
          type="button"
        >
          <Shield className="size-3.5" />
          <span>Seguros</span>
        </button>
      </div>
    </div>
  );
}
