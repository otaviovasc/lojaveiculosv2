import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Play,
  SearchCheck,
} from "lucide-react";
import { providerLabels } from "./marketplaceLabels";
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
  const connected =
    state?.connectionStatus === "connected" ||
    state?.connectionStatus === "refreshable" ||
    account?.status === "active";
  return (
    <article className="marketplace-card">
      <header className="marketplace-card-header">
        <span className={connected ? "is-enabled" : "is-disabled"}>
          {connected ? (
            <BadgeCheck aria-hidden="true" className="size-4" />
          ) : (
            <Ban aria-hidden="true" className="size-4" />
          )}
          {connectionLabel(state?.connectionStatus, account)}
        </span>
        <h3>{providerLabels[provider]}</h3>
        <p>Publicacao manual de estoque da loja, sem importar leads.</p>
      </header>
      <div className="marketplace-actions">
        <button
          disabled={isSaving}
          onClick={() => void onConnect(provider)}
          type="button"
        >
          Conectar OAuth
        </button>
        <button
          disabled={isSaving}
          onClick={() => void onStatusChange(provider, "active")}
          type="button"
        >
          Ativar
        </button>
        <button
          disabled={isSaving}
          onClick={() => void onStatusChange(provider, "inactive")}
          type="button"
        >
          Pausar
        </button>
      </div>
      <div className="marketplace-form-grid">
        <input
          aria-label={`Codigo OAuth ${providerLabels[provider]}`}
          onChange={(event) => onOauthCodeChange(provider, event.target.value)}
          placeholder="Codigo OAuth do portal"
          value={oauthCode}
        />
        <button
          disabled={isSaving || !oauthCode.trim()}
          onClick={() => void onCompleteConnection(provider)}
          type="button"
        >
          Finalizar conexao
        </button>
      </div>
      <MarketplaceRequirementChecklist state={state} />
      <div className="marketplace-job-actions">
        <button
          disabled={isSaving || !connected}
          onClick={() => void onPreview(provider)}
          type="button"
        >
          <SearchCheck aria-hidden="true" className="size-4" />
          Prever estoque
        </button>
        <button
          disabled={isSaving || !connected || !preview || preview.total === 0}
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
          {requirements.map((requirement) => (
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
                <strong>{requirement.message}</strong>
                <small>{requirement.userAction}</small>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nenhuma pendencia informada pelo provedor.</p>
      )}
    </section>
  );
}

function connectionLabel(
  status: MarketplaceProviderState["connectionStatus"] | undefined,
  account: MarketplaceAccount | undefined,
) {
  if (status) return status.replaceAll("_", " ");
  return account?.status ?? "nao conectado";
}
