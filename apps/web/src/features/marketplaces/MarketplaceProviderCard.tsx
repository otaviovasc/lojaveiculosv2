import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Play,
  SearchCheck,
} from "lucide-react";
import {
  getMarketplaceConnectionLabel,
  getMarketplaceRequirementCopy,
  providerLabels,
} from "./marketplaceLabels";
import { resolveMarketplaceConnectionPresentation } from "./marketplaceConnectionPresentation";
import { MarketplaceProviderBrand } from "./MarketplaceProviderBrand";
import type {
  MarketplaceAccount,
  MarketplaceProvider,
  MarketplaceProviderState,
  MarketplaceStockPlan,
} from "./types";

export function MarketplaceProviderCard({
  account,
  isSaving,
  onCompleteConnection,
  onConnect,
  onOauthCodeChange,
  onPreview,
  onRun,
  onStatusChange,
  oauthCode,
  preview,
  provider,
  state,
}: {
  account: MarketplaceAccount | undefined;
  isSaving: boolean;
  oauthCode: string;
  onCompleteConnection: (provider: MarketplaceProvider) => Promise<void>;
  onConnect: (provider: MarketplaceProvider) => Promise<void>;
  onOauthCodeChange: (provider: MarketplaceProvider, value: string) => void;
  onPreview: (provider: MarketplaceProvider) => Promise<void>;
  onRun: (provider: MarketplaceProvider) => Promise<void>;
  onStatusChange: (
    provider: MarketplaceProvider,
    status: "active" | "inactive",
  ) => Promise<void>;
  preview: MarketplaceStockPlan | null;
  provider: MarketplaceProvider;
  state: MarketplaceProviderState | undefined;
}) {
  const connection = resolveMarketplaceConnectionPresentation(state, account);
  const statusAction = connection.statusAction;
  const ConnectionIcon =
    connection.tone === "success" ? BadgeCheck : AlertTriangle;
  return (
    <article
      className="marketplace-card"
      data-connection-tone={connection.tone}
      data-provider={provider}
    >
      <header className="marketplace-card-header">
        <div className="marketplace-card-header__topline">
          <MarketplaceProviderBrand provider={provider} />
          <span
            className={`marketplace-connection-status is-${connection.tone}`}
          >
            <ConnectionIcon aria-hidden="true" className="size-4" />
            {getMarketplaceConnectionLabel(
              state?.connectionStatus,
              account?.status,
            )}
          </span>
        </div>
        <p className="marketplace-card__purpose">
          Publique, atualize e retire anúncios em lote. Leads continuam fora
          desta integração.
        </p>
      </header>
      <div className="marketplace-actions">
        {connection.connectLabel ? (
          <button
            disabled={isSaving}
            onClick={() => void onConnect(provider)}
            type="button"
          >
            {connection.connectLabel}
          </button>
        ) : null}
        {statusAction ? (
          <button
            disabled={isSaving}
            onClick={() => void onStatusChange(provider, statusAction.status)}
            type="button"
          >
            {statusAction.label}
          </button>
        ) : null}
      </div>
      <details className="marketplace-authorization">
        <summary>Inserir código de autorização</summary>
        <div className="marketplace-form-grid">
          <input
            aria-label={`Código de autorização do ${providerLabels[provider]}`}
            onChange={(event) =>
              onOauthCodeChange(provider, event.target.value)
            }
            placeholder="Código recebido após autorizar a conta"
            value={oauthCode}
          />
          <button
            disabled={isSaving || !oauthCode.trim()}
            onClick={() => void onCompleteConnection(provider)}
            type="button"
          >
            Finalizar conexão
          </button>
        </div>
      </details>
      <MarketplaceRequirementChecklist state={state} />
      <div className="marketplace-job-actions">
        <button
          disabled={isSaving || !connection.canSync}
          onClick={() => void onPreview(provider)}
          type="button"
        >
          <SearchCheck aria-hidden="true" className="size-4" />
          Prever estoque
        </button>
        <button
          disabled={
            isSaving || !connection.canSync || !preview || preview.total === 0
          }
          onClick={() => void onRun(provider)}
          type="button"
        >
          <Play aria-hidden="true" className="size-4" />
          Enfileirar lote
        </button>
      </div>
    </article>
  );
}

function MarketplaceRequirementChecklist({
  state,
}: {
  state: MarketplaceProviderState | undefined;
}) {
  const requirements = state?.requirements ?? [];
  return (
    <section className="marketplace-checklist" aria-label="Checklist da conta">
      <h4>Checklist da conta</h4>
      {requirements.length ? (
        <ul>
          {requirements.map((requirement) => {
            const copy = getMarketplaceRequirementCopy(requirement);
            return (
              <li
                className={`is-${requirement.severity}`}
                key={`${requirement.code}-${requirement.message}`}
              >
                {requirement.severity === "ok" ? (
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                ) : (
                  <AlertTriangle aria-hidden="true" className="size-4" />
                )}
                <span>
                  <strong>{copy.message}</strong>
                  <small>{copy.action}</small>
                </span>
              </li>
            );
          })}
        </ul>
      ) : !state ? (
        <p>O provedor ainda não informou o checklist desta conta.</p>
      ) : (
        <p>Checklist concluído: nenhuma pendência operacional encontrada.</p>
      )}
    </section>
  );
}
