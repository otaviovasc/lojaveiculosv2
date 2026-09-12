import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  X,
} from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
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
} from "./types";

export function MarketplaceProviderModal({
  account,
  isOpen,
  onClose,
  provider,
  state,
}: {
  account: MarketplaceAccount | undefined;
  isOpen: boolean;
  onClose: () => void;
  provider: MarketplaceProvider;
  state: MarketplaceProviderState | undefined;
}) {
  const connection = resolveMarketplaceConnectionPresentation(state, account);
  const presentation = marketplaceProviderPresentation[provider];
  const providerLabel = providerLabels[provider];
  const requirements = state?.requirements ?? [];

  return (
    <FeatureDialog
      className="marketplace-modal-dialog"
      icon={<ShieldCheck aria-hidden="true" className="size-5" />}
      isOpen={isOpen}
      onClose={onClose}
      title={`${providerLabel} · Requisitos do canal`}
    >
      <div className="marketplace-modal-content">
        <div className="marketplace-modal-brand-row">
          <MarketplaceProviderBrand provider={provider} />
          <FeatureStatusBadge tone={connection.tone}>
            {getMarketplaceConnectionLabel(
              state?.connectionStatus,
              account?.status,
            )}
          </FeatureStatusBadge>
        </div>

        <p className="marketplace-modal-description">
          {presentation.description}
        </p>

        <div className="marketplace-modal-section">
          <div className="marketplace-modal-section__title">
            <ClipboardCheck aria-hidden="true" className="size-4 text-accent" />
            <span>Validações do canal</span>
          </div>
          <ul className="marketplace-modal-list">
            {presentation.readinessItems.map((item) => (
              <li key={item}>
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 text-success-strong"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="marketplace-modal-section">
          <div className="marketplace-modal-section__title">
            <ShieldCheck aria-hidden="true" className="size-4 text-accent" />
            <span>Estado da conta</span>
          </div>
          {requirements.length ? (
            <ul className="marketplace-modal-list">
              {requirements.map((req) => {
                const copy = getMarketplaceRequirementCopy(req);
                return (
                  <li key={`${req.code}-${req.message}`}>
                    {req.severity === "ok" ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4 text-success-strong"
                      />
                    ) : (
                      <AlertTriangle
                        aria-hidden="true"
                        className="size-4 text-warning-strong"
                      />
                    )}
                    <div>
                      <strong>{copy.message}</strong>
                      <small>{copy.action}</small>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="marketplace-modal-empty">
              Nenhuma pendência operacional encontrada nesta conta.
            </p>
          )}
        </div>

        <div className="marketplace-modal-actions">
          <FeatureActionButton icon={X} label="Fechar janela" onClick={onClose}>
            Fechar
          </FeatureActionButton>
        </div>
      </div>
    </FeatureDialog>
  );
}
