import { Clock3, RefreshCcw } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import { UserAccountButton } from "./UserAccountButton";

export function AccountAccessUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <FeaturePageShell
      className="min-h-screen max-w-xl justify-center"
      variant="plain"
    >
      <FeatureEmptyState
        action={
          <div className="grid gap-4">
            <FeatureActionButton
              icon={RefreshCcw}
              label="Verificar novamente"
              onClick={onRetry}
              variant="primary"
            />
            <UserAccountButton />
          </div>
        }
        body="Sua autenticação foi concluída, mas esta conta ainda não possui acesso ativo. Abra o link do convite recebido ou peça ao administrador da loja para reenviá-lo."
        icon={Clock3}
        title="Acesso à loja pendente"
        tone="warning"
      />
    </FeaturePageShell>
  );
}
