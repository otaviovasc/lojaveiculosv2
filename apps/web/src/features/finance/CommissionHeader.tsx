import { Download, HandCoins, PlusCircle } from "lucide-react";
import { FinanceBadge } from "./FinanceFormParts";
import { formatCurrency } from "./financeBillsFormat";
import type { CommissionSummary } from "./commissionWorkspaceModel";

export function CommissionHeader({
  onCreateBonus,
  onExport,
  summary,
}: {
  onCreateBonus: () => void;
  onExport: () => void;
  summary: CommissionSummary;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <FinanceBadge>Financeiro</FinanceBadge>
            <FinanceBadge>Comissoes por vendedor</FinanceBadge>
          </div>
          <h2 className="text-2xl font-black text-app-text lg:text-4xl">
            Comissoes
          </h2>
          <p className="max-w-3xl text-sm font-bold text-muted">
            Fechamento por vendedor usando lancamentos financeiros do tipo
            comissao, com pagamento auditado por lancamento da loja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-app px-4 text-sm font-black text-app-text"
            onClick={onExport}
            type="button"
          >
            <Download aria-hidden="true" className="size-4" />
            Exportar CSV
          </button>
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse"
            onClick={onCreateBonus}
            type="button"
          >
            <PlusCircle aria-hidden="true" className="size-4" />
            Bonus manual
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-black">
        <span className="rounded-lg bg-accent-soft px-3 py-2 text-accent-strong">
          A pagar {formatCurrency(summary.pendingCents)}
        </span>
        <span className="rounded-lg border border-line bg-app px-3 py-2 text-app-text">
          Pago {formatCurrency(summary.paidCents)}
        </span>
        <span className="rounded-lg border border-line bg-app px-3 py-2 text-muted">
          {summary.count} lancamento(s)
        </span>
      </div>
    </section>
  );
}

export function CommissionEmptyState({
  hasFilters,
  isLoading,
}: {
  hasFilters: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-line bg-panel p-8 text-center text-sm font-black text-muted">
        Carregando comissoes.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-8 text-center">
      <HandCoins className="mx-auto size-9 text-muted" />
      <h3 className="mt-3 text-base font-black text-app-text">
        {hasFilters
          ? "Nenhuma comissao corresponde aos filtros"
          : "Nenhuma comissao encontrada"}
      </h3>
      <p className="mt-1 text-sm font-bold text-muted">
        Ajuste periodo, vendedor, origem ou status para revisar outros
        lancamentos.
      </p>
    </div>
  );
}
