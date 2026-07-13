import { RefreshCcw } from "lucide-react";
import { FeatureCard } from "../../components/ui/FeatureCards";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import type { StorefrontCustomizationStatus } from "./storefrontCustomizationTypes";

export function StorefrontLoadingState({
  status,
}: {
  status: StorefrontCustomizationStatus;
}) {
  return (
    <div className="website-builder-surface flex min-h-dvh items-center justify-center text-foreground">
      {status.kind === "error" ? (
        <FeatureAlert>{status.message}</FeatureAlert>
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
