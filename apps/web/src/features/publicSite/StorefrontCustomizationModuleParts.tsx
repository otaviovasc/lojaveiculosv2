import { RefreshCcw } from "lucide-react";
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
        <FeatureLoadingState className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 text-sm font-semibold text-muted-foreground shadow-sm">
          <RefreshCcw aria-hidden="true" className="h-4 w-4 animate-spin" />
          <span>Carregando site</span>
        </FeatureLoadingState>
      )}
    </div>
  );
}
