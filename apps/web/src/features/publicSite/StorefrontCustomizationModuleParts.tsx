import { RefreshCcw } from "lucide-react";
import { FeatureCard } from "../../components/ui/FeatureCards";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import type { StorefrontCustomizationStatus } from "./storefrontCustomizationTypes";

export function StorefrontLoadingState({
  onRetry,
  status,
}: {
  onRetry: () => void;
  status: StorefrontCustomizationStatus;
}) {
  return (
    <div className="website-builder-surface flex min-h-dvh items-center justify-center text-foreground">
      {status.kind === "error" ? (
        <FeatureAlert
          action={
            <FeatureActionButton
              icon={RefreshCcw}
              label="Tentar novamente"
              onClick={onRetry}
            />
          }
          title="Não foi possível carregar o site"
        >
          {status.message}
        </FeatureAlert>
      ) : (
        <FeatureCard
          className="text-sm font-semibold text-muted-foreground"
          padding="compact"
        >
          <FeatureLoadingState className="flex items-center gap-3">
            <RefreshCcw aria-hidden="true" className="h-4 w-4 animate-spin" />
            <span>Carregando site</span>
          </FeatureLoadingState>
        </FeatureCard>
      )}
    </div>
  );
}
