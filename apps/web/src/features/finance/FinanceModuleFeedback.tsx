import { RefreshCcw } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { FinanceListState, FinanceToast } from "./financeBillsModel";

export function FinanceAccessNotice({ canManage }: { canManage: boolean }) {
  if (canManage) return null;
  return (
    <FeatureAlert className="feature-alert" tone="info">
      Visualização financeira em modo somente leitura. Você pode consultar e
      exportar o fluxo de caixa; alterações exigem permissão financeira
      adicional.
    </FeatureAlert>
  );
}

export function CommissionAccessNotice({ canManage }: { canManage: boolean }) {
  if (canManage) return null;
  return (
    <FeatureAlert className="feature-alert" tone="info">
      Visualização financeira em modo somente leitura. Bônus, pagamentos e
      ajustes dependem de permissões adicionais.
    </FeatureAlert>
  );
}

export function FinanceLoadError({
  listState,
  onRetry,
}: {
  listState: FinanceListState;
  onRetry: () => void;
}) {
  if (listState.kind !== "error") return null;
  return (
    <FeatureAlert
      action={
        <FeatureActionButton
          icon={RefreshCcw}
          label="Tentar novamente"
          onClick={onRetry}
          variant="primary"
        />
      }
      className="feature-alert"
      title="Dados financeiros indisponíveis"
      tone="danger"
    >
      {listState.message}
    </FeatureAlert>
  );
}

export function FinanceToastMessage({ toast }: { toast: FinanceToast }) {
  return (
    <div className="rounded-lg border border-line bg-accent-soft p-3 text-sm font-black text-accent-strong">
      {toast.title}: {toast.message}
    </div>
  );
}
