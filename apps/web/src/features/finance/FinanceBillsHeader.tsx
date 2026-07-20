import { Download, FileBarChart2, PlusCircle } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";

export function FinanceBillsHeader({
  canCreate = true,
  onCreate,
  onExport,
  onReports,
}: {
  canCreate?: boolean;
  onCreate: () => void;
  onExport?: () => void;
  onReports: () => void;
}) {
  return (
    <FeaturePageHeader
      actions={
        <>
          {onExport ? (
            <FeatureActionButton
              icon={Download}
              label="Exportar CSV"
              onClick={onExport}
            />
          ) : null}
          <FeatureActionButton
            icon={FileBarChart2}
            label="Relatórios"
            onClick={onReports}
          />
          {canCreate ? (
            <FeatureActionButton
              icon={PlusCircle}
              label="Novo lançamento"
              onClick={onCreate}
              variant="primary"
            />
          ) : null}
        </>
      }
      description="Controle total de receitas e despesas, com saldo planejado e realizado por período."
      eyebrow={
        <>
          Financeiro
          <span aria-hidden="true">·</span>
          Controle de gastos
        </>
      }
      title="Fluxo de caixa"
    />
  );
}
