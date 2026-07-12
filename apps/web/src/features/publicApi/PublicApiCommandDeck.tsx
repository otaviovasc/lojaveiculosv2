import { KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";
import {
  FeatureActionButton,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";

export function PublicApiCommandDeck({
  isLoading,
  onRefresh,
}: {
  isLoading: boolean;
  onRefresh: () => void;
}) {
  return (
    <FeatureToolbar className="public-api-command-bar">
      <div className="public-api-command-bar__identity">
        <span className="public-api-command-bar__mark">
          <KeyRound aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="public-api-command-bar__meta">
            <span>Integrações seguras</span>
            <span>
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Contrato V2
            </span>
          </p>
          <h1>Public API</h1>
          <p className="public-api-command-bar__description">
            Chaves escopadas, artefatos de integração e rotas operacionais.
          </p>
        </div>
      </div>
      <div
        aria-label="Ações da Public API"
        className="public-api-command-bar__actions"
        role="toolbar"
      >
        <FeatureActionButton
          icon={RefreshCcw}
          isBusy={isLoading}
          label="Atualizar"
          onClick={onRefresh}
          title="Atualizar clientes da Public API"
        />
      </div>
    </FeatureToolbar>
  );
}
