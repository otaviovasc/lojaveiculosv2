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
  canCreate = true,
  onCreateBonus,
  onExport,
  summary,
}: {
  canCreate?: boolean;
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
            {canCreate ? (
              <FeatureActionButton
                icon={PlusCircle}
                label="Bônus manual"
                onClick={onCreateBonus}
                variant="primary"
              />
            ) : null}
          </>
        }
        description="Fechamento por vendedor usando lançamentos financeiros do tipo comissão, com pagamento auditado por lançamento da loja."
        eyebrow={
          <>
            Financeiro
            <span aria-hidden="true">·</span>
            Comissões por vendedor
          </>
        }
        title="Comissões"
      />
      <div className="flex flex-wrap gap-2 text-sm font-black">
        <span className="rounded-lg bg-accent-soft px-3 py-2 text-accent-strong">
          A pagar {formatCurrency(summary.pendingCents)}
        </span>
        <span className="rounded-lg border border-line bg-app px-3 py-2 text-app-text">
          Pago {formatCurrency(summary.paidCents)}
        </span>
        <span className="rounded-lg border border-line bg-app px-3 py-2 text-muted">
          {summary.count} lançamento(s)
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
    return <FeatureLoadingState title="Carregando comissões." />;
  }

  return (
    <FeatureEmptyState
      body="Ajuste período, vendedor, origem ou status para revisar outros lançamentos."
      icon={HandCoins}
      title={
        hasFilters
          ? "Nenhuma comissão corresponde aos filtros"
          : "Nenhuma comissão encontrada"
      }
    />
  );
}
