import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Play,
  SearchCheck,
} from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  getMarketplaceConnectionLabel,
  getMarketplaceRequirementCopy,
  providerLabels,
} from "./marketplaceLabels";
import { resolveMarketplaceConnectionPresentation } from "./marketplaceConnectionPresentation";
import { marketplaceProviderPresentation } from "./marketplaceProviderPresentation";
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
  const presentation = marketplaceProviderPresentation[provider];
  const providerLabel = providerLabels[provider];
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
        <div className="marketplace-card__intro">
          <span className="marketplace-card__channel-type">
            {presentation.channelType}
          </span>
          <p>{presentation.description}</p>
        </div>
      </header>

      <section
        aria-label={`O que o ${providerLabel} valida`}
        className="marketplace-channel-contract"
      >
        <div className="marketplace-channel-contract__heading">
          <ClipboardCheck aria-hidden="true" className="size-4" />
          <strong>O canal valida</strong>
        </div>
        <ul>
          {presentation.readinessItems.map((item) => (
            <li key={item}>
              <CheckCircle2 aria-hidden="true" className="size-4" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <MarketplaceRequirementChecklist state={state} />

      <div className="marketplace-actions">
        {connection.connectLabel ? (
          <FeatureActionButton
            {...(connection.tone === "success" ? { icon: BadgeCheck } : {})}
            isBusy={isSaving}
            label={`${connection.connectLabel} do ${providerLabel}`}
            onClick={() => void onConnect(provider)}
            variant={connection.canSync ? "secondary" : "primary"}
          >
            {connection.connectLabel}
          </FeatureActionButton>
        ) : null}
        {statusAction ? (
          <FeatureActionButton
            isBusy={isSaving}
            label={`${statusAction.label} publicações no ${providerLabel}`}
            onClick={() => void onStatusChange(provider, statusAction.status)}
          >
            {statusAction.label === "Pausar" ? "Pausar envios" : "Ativar conta"}
          </FeatureActionButton>
        ) : null}
      </div>

      {!connection.canSync ? (
        <details className="marketplace-authorization">
          <summary>Conexão manual para suporte</summary>
          <p>{presentation.authorizationHint}</p>
          <div className="marketplace-form-grid">
            <FeatureInput
              aria-label={`Código de autorização do ${providerLabel}`}
              disabled={isSaving}
              minLength={8}
              onChange={(event) =>
                onOauthCodeChange(provider, event.target.value)
              }
              placeholder="Cole o código devolvido pelo canal"
              value={oauthCode}
            />
            <FeatureActionButton
              disabled={oauthCode.trim().length < 8}
              isBusy={isSaving}
              label={`Finalizar conexão manual do ${providerLabel}`}
              onClick={() => void onCompleteConnection(provider)}
            >
              Finalizar conexão
            </FeatureActionButton>
          </div>
        </details>
      ) : null}

      <footer className="marketplace-card__footer">
        <div className="marketplace-preview-summary">
          <strong>{preview ? preview.total : "—"}</strong>
          <span>
            {preview
              ? `${preview.total === 1 ? "veículo avaliado" : "veículos avaliados"} · ${preview.blocked} bloqueados`
              : "Gere a prévia antes de enviar"}
          </span>
        </div>
        <div className="marketplace-job-actions">
          <FeatureActionButton
            disabled={!connection.canSync}
            icon={SearchCheck}
            isBusy={isSaving}
            label={`${presentation.previewLabel} no ${providerLabel}`}
            onClick={() => void onPreview(provider)}
          >
            {presentation.previewLabel}
          </FeatureActionButton>
          <FeatureActionButton
            disabled={!connection.canSync || !preview || preview.total === 0}
            icon={Play}
            isBusy={isSaving}
            label={presentation.runLabel}
            onClick={() => void onRun(provider)}
            variant="primary"
          />
        </div>
      </footer>
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
      <h4>Estado da conta</h4>
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
        <p>O canal ainda não informou a prontidão desta conta.</p>
      ) : (
        <p>Nenhuma pendência operacional encontrada nesta conta.</p>
      )}
    </section>
  );
}
