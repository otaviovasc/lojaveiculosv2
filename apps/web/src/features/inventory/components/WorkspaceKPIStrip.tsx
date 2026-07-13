import { Briefcase, Shield } from "lucide-react";

export function WorkspaceKPIStrip({
  salePrice,
  acquisitionPrice,
  margin,
  stockTime,
  renaveStatus,
}: {
  salePrice: string;
  acquisitionPrice: string;
  margin: string;
  stockTime: string;
  renaveStatus: string;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center bg-panel/30 border border-line/60 rounded-2xl p-4.5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4.5 flex-1 min-w-0">
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase tracking-wider text-muted">
            Preço de Venda
          </span>
          <span className="block text-base font-black text-accent-strong mt-0.5">
            {salePrice}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase tracking-wider text-muted">
            Custos Registrados
          </span>
          <span className="block text-base font-black mt-0.5 text-app-text">
            {acquisitionPrice}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase tracking-wider text-muted">
            Margem Base
          </span>
          <span className="mt-0.5 block text-base font-black text-success-strong">
            {margin}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase tracking-wider text-muted">
            Tempo em Pátio
          </span>
          <span className="mt-0.5 block text-base font-black text-warning-strong">
            {stockTime}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-xs font-black uppercase tracking-wider text-muted">
            Status do Anúncio
          </span>
          <span className="mt-0.5 block text-base font-black text-accent-strong">
            {renaveStatus}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line/60 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app-elevated px-3.5 py-1.5 text-xs font-black text-muted"
          title="O financiamento é configurado durante a formalização da venda"
        >
          <Briefcase className="size-3.5" />
          <span>Financiamento na venda</span>
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app-elevated px-3.5 py-1.5 text-xs font-black text-muted"
          title="O seguro é configurado durante a formalização da venda"
        >
          <Shield className="size-3.5" />
          <span>Seguro na venda</span>
        </span>
      </div>
    </div>
  );
}
