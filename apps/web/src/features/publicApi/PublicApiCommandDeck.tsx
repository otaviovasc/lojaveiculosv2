import { Check, Copy, KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";
import {
  FeatureActionButton,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";

export function PublicApiCommandDeck({
  activeClientCount,
  apiBaseUrl,
  copiedBaseUrl,
  hasLoadedClients,
  isLoading,
  onCopyBaseUrl,
  onRefresh,
}: {
  activeClientCount: number;
  apiBaseUrl: string;
  copiedBaseUrl: boolean;
  hasLoadedClients: boolean;
  isLoading: boolean;
  onCopyBaseUrl: () => void;
  onRefresh: () => void;
}) {
  return (
    <FeatureToolbar className="public-api-command-bar">
      <div className="public-api-command-bar__copy">
        <p className="public-api-command-bar__meta">
          <span>Plataforma</span>
          <span>
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Contrato V2
          </span>
        </p>
        <div className="public-api-command-bar__title-row">
          <span className="public-api-command-bar__mark">
            <KeyRound aria-hidden="true" className="size-5" />
          </span>
          <h1>
            Public API
            <strong>Integre sistemas. Preserve o controle.</strong>
          </h1>
        </div>
        <p className="public-api-command-bar__description">
          Crie acessos por finalidade, libere somente o necessário e entregue
          uma integração pronta para produção.
        </p>
      </div>

      <div className="public-api-command-bar__console">
        <div className="public-api-command-bar__console-header">
          <span>
            <i aria-hidden="true" /> Ambiente operacional
          </span>
          <small>REST · JSON</small>
        </div>
        <div className="public-api-command-bar__endpoint">
          <small>URL base</small>
          <code>{apiBaseUrl}</code>
          <button
            aria-label={copiedBaseUrl ? "URL base copiada" : "Copiar URL base"}
            className="internal-icon-action"
            onClick={onCopyBaseUrl}
            title="Copiar URL base"
            type="button"
          >
            {copiedBaseUrl ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
        <div className="public-api-command-bar__status-row">
          <span>
            <small>Clientes ativos</small>
            <strong>{hasLoadedClients ? activeClientCount : "—"}</strong>
          </span>
          <span>
            <small>Autenticação</small>
            <strong>x-api-key</strong>
          </span>
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
        </div>
      </div>
    </FeatureToolbar>
  );
}
