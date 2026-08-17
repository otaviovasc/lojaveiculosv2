import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Pause,
  Play,
  SearchCheck,
} from "lucide-react";
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
  onConnect,
  onPreview,
  onRun,
  onStatusChange,
  preview,
  provider,
  state,
}: {
  account: MarketplaceAccount | undefined;
  isSaving: boolean;
  onConnect: (provider: MarketplaceProvider) => Promise<void>;
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
  const canPublish = Boolean(
    preview && preview.publish + preview.update + preview.unpublish > 0,
  );
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
        <p className="marketplace-preview-summary">
          {preview
            ? `Prévia: ${preview.accounting.found} ${preview.accounting.found === 1 ? "veículo encontrado" : "veículos encontrados"} · ${preview.accounting.needsCorrection} precisam de correção`
            : "Gere a prévia para diagnosticar o estoque antes do envio."}
        </p>
        <div className="marketplace-actions">
          <FeatureActionButton
            icon={SearchCheck}
            isBusy={isSaving}
            label={`${presentation.previewLabel} no ${providerLabel}`}
            onClick={() => void onPreview(provider)}
          >
            Gerar prévia
          </FeatureActionButton>
          {connection.canSync ? (
            <>
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
