import { Download, HandCoins, PlusCircle } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";

export function CommissionHeader({
  canCreate = true,
  onCreateBonus,
  onExport,
}: {
  canCreate?: boolean;
  onCreateBonus: () => void;
  onExport: () => void;
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
        description="Conferência por vendedor, venda e veículo, com conciliação explícita e fechamento atômico das pendências do período."
        eyebrow={
          <>
            Financeiro
            <span aria-hidden="true">·</span>
            Comissões por vendedor
          </>
        }
        title="Comissões"
      />
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
      density="compact"
      icon={HandCoins}
      title={
        hasFilters
          ? "Nenhuma comissão corresponde aos filtros"
          : "Nenhuma comissão encontrada"
      }
    />
  );
}
