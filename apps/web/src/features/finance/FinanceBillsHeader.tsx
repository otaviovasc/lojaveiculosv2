import { Download, FileBarChart2, PlusCircle, ReceiptText } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";

export function FinanceBillsHeader({
  onCreate,
  onExport,
  onReports,
}: {
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
              label="Relatorios"
              onClick={onReports}
            />
            <FeatureActionButton
              icon={PlusCircle}
              label="Novo lancamento"
              onClick={onCreate}
              variant="primary"
            />
          </>
        }
        description="Fluxo de caixa da loja com vencimentos, status de pagamento, recorrencias e comprovantes vinculados aos lancamentos."
        eyebrow={
          <>
            Financeiro
            <span aria-hidden="true">·</span>
            Contas e recibos
          </>
        }
        title="Gastos e contas"
      />
      <FeatureAlert className="feature-alert">
        <ReceiptText aria-hidden="true" className="size-4" />
        Recibos usam upload assinado e vinculo auditado ao lancamento
        financeiro.
      </FeatureAlert>
    </>
  );
}
