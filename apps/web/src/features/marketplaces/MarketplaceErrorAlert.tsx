import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { MarketplaceErrorDisplay } from "./marketplaceErrors";

export function MarketplaceErrorAlert(display: MarketplaceErrorDisplay) {
  return (
    <FeatureAlert title="Falha no marketplace">
      <p>
        {display.failed} {display.fix}
      </p>
      <small className="marketplace-alert__meta">
        Provedor: {display.provider} · Código para suporte: {display.requestId}
      </small>
    </FeatureAlert>
  );
}
