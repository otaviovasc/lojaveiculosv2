import {
  Download,
  FileBarChart2,
  PlusCircle,
  ReceiptText,
  RefreshCcw,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";

export function FinanceBillsHeader({
  canCreate = true,
  chip,
  onCreate,
  onExport,
  onRefresh,
  onReports,
}: {
  canCreate?: boolean;
  chip?: ReactNode;
  onCreate: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onReports: () => void;
}) {
  return (
    <FeaturePageHeader
      actions={
        <>
          {onRefresh ? (
            <FeatureActionButton
              icon={RefreshCcw}
              label="Atualizar"
              onClick={onRefresh}
              title="Atualizar lançamentos financeiros"
            />
          ) : null}
          {onExport ? (
            <FeatureActionButton
              icon={Download}
              label="Exportar CSV"
              onClick={onExport}
              title="Exportar lançamentos filtrados em CSV"
            />
          ) : null}
          <FeatureActionButton
            icon={FileBarChart2}
            label="Relatórios"
            onClick={onReports}
            title="Abrir relatórios financeiros"
          />
          {canCreate ? (
            <FeatureActionButton
              icon={PlusCircle}
              label="Novo lançamento"
              onClick={onCreate}
              title="Criar novo gasto ou receita"
              variant="primary"
            />
          ) : null}
        </>
      }
      chip={chip}
      className="fiscal-shell-header finance-shell-header"
      description="Controle financeiro completo, lançamentos operacionais, pagamentos pendentes e fluxo de caixa da loja."
      eyebrow={
        <>
          <ReceiptText aria-hidden="true" className="size-4" />
          Operação financeira
        </>
      }
      title="Fluxo de caixa"
    />
  );
}
