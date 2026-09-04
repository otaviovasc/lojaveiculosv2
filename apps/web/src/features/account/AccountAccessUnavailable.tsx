import { Clock3, RefreshCcw } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import "../../styles/account-auth.css";
import { UserAccountButton } from "./UserAccountButton";

export function AccountAccessUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="account-auth-shell">
      <div aria-hidden="true" className="account-auth-glow" />
      <div className="account-glass-card max-w-xl text-center">
        <FeatureEmptyState
          action={
            <div className="grid gap-4 w-full pt-2">
              <FeatureActionButton
                className="account-primary-button"
                icon={RefreshCcw}
                label="Verificar novamente"
                onClick={onRetry}
                variant="primary"
              />
              <div className="flex justify-center border-t border-line pt-3">
                <UserAccountButton />
              </div>
            </div>
          }
          body="Sua conta ainda não possui uma loja vinculada com acesso ativo. Verifique o convite recebido por e-mail ou solicite a liberação ao administrador da loja."
          icon={Clock3}
          title="Acesso à loja pendente"
          tone="warning"
        />
      </div>
    </main>
  );
}
