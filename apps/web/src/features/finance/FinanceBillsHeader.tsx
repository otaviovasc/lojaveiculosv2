import { Download, FileBarChart2, PlusCircle, ReceiptText } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";

export function FinanceBillsHeader({
  canCreate = true,
  onCreate,
  onExport,
  onReports,
}: {
  canCreate?: boolean;
  onCreate: () => void;
  onExport: () => void;
  onReports: () => void;
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
        description="Controle de gastos e entradas com saldo planejado, saldo real, vencimentos, recorrências, comissões e comprovantes auditados."
        eyebrow={
          <>
            Financeiro
            <span aria-hidden="true">·</span>
            Contas e recibos
          </>
        }
        title="Fluxo de caixa"
      />
      <FeatureAlert className="feature-alert" tone="info">
        <ReceiptText aria-hidden="true" className="size-4" />
        Anexos, recibos e custos de veículo permanecem vinculados ao lançamento
        financeiro e à trilha de auditoria.
      </FeatureAlert>
    </>
  );
}
