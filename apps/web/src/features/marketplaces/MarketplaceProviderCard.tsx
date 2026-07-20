import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Pause,
  Play,
  SearchCheck,
} from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
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
  const canPublish = Boolean(preview && preview.total > 0);
  const hasRequirementAttention = (state?.requirements ?? []).some(
    (requirement) => requirement.severity !== "ok",
  );

  return (
    <article
      className="marketplace-card"
      data-connection-tone={connection.tone}
      data-provider={provider}
    >
      <header className="marketplace-card-header">
        <div className="marketplace-card-header__topline">
          <MarketplaceProviderBrand provider={provider} />
          <FeatureStatusBadge tone={connection.tone}>
            {getMarketplaceConnectionLabel(
              state?.connectionStatus,
              account?.status,
            )}
          </FeatureStatusBadge>
        </div>
        <div className="marketplace-card__intro">
          <span className="marketplace-card__channel-type">
            {presentation.channelType}
          </span>
          <p>{presentation.description}</p>
        </div>
      </header>

      <details
        className="marketplace-requirements"
        open={hasRequirementAttention || undefined}
      >
        <summary>Requisitos do canal</summary>
        <div className="marketplace-requirements__body">
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
        </div>
      </details>

      <footer className="marketplace-card__footer">
        {connection.canSync ? (
          <p className="marketplace-preview-summary">
            {preview
              ? `Prévia: ${preview.total} ${preview.total === 1 ? "veículo avaliado" : "veículos avaliados"} · ${preview.blocked} bloqueados`
              : "Gere a prévia antes de enviar o estoque."}
          </p>
        ) : null}
        <div className="marketplace-actions">
          {connection.canSync ? (
            <>
              <FeatureActionButton
                icon={SearchCheck}
                isBusy={isSaving}
                label={`${presentation.previewLabel} no ${providerLabel}`}
                onClick={() => void onPreview(provider)}
              >
                Gerar prévia
              </FeatureActionButton>
              <FeatureActionButton
                disabled={!canPublish}
                icon={Play}
                isBusy={isSaving}
                label={presentation.runLabel}
                onClick={() => void onRun(provider)}
                variant="primary"
              />
              {statusAction ? (
                <FeatureRowAction
                  ariaLabel={`${statusAction.label} publicações no ${providerLabel}`}
                  disabled={isSaving}
                  icon={Pause}
                  onClick={() =>
                    void onStatusChange(provider, statusAction.status)
                  }
                  tooltip="Pausar envios"
                />
              ) : null}
            </>
          ) : connection.connectLabel ? (
            <FeatureActionButton
              isBusy={isSaving}
              label={`${connection.connectLabel} do ${providerLabel}`}
              onClick={() => void onConnect(provider)}
              variant="primary"
            >
              {connection.connectLabel}
            </FeatureActionButton>
          ) : statusAction ? (
            <FeatureActionButton
              isBusy={isSaving}
              label={`${statusAction.label} publicações no ${providerLabel}`}
              onClick={() => void onStatusChange(provider, statusAction.status)}
              variant="primary"
            >
              Ativar conta
            </FeatureActionButton>
          ) : null}
        </div>
      </footer>

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
