import { Download, HandCoins, PlusCircle } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
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
    <>
      <FeaturePageHeader
        actions={
          <>
            <FeatureActionButton
              icon={Download}
              label="Exportar CSV"
              onClick={onExport}
            />
            <FeatureActionButton
              icon={PlusCircle}
              label="Bonus manual"
              onClick={onCreateBonus}
              variant="primary"
            />
          </>
        }
        description="Fechamento por vendedor usando lancamentos financeiros do tipo comissao, com pagamento auditado por lancamento da loja."
        eyebrow={
          <>
            Financeiro
            <span aria-hidden="true">·</span>
            Comissoes por vendedor
          </>
        }
        title="Comissoes"
      />
      <div className="flex flex-wrap gap-2 text-sm font-black">
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
    </>
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
    return <FeatureLoadingState title="Carregando comissoes." />;
  }

  return (
    <FeatureEmptyState
      body="Ajuste periodo, vendedor, origem ou status para revisar outros lancamentos."
      icon={HandCoins}
      title={
        hasFilters
          ? "Nenhuma comissao corresponde aos filtros"
          : "Nenhuma comissao encontrada"
      }
    />
  );
}
