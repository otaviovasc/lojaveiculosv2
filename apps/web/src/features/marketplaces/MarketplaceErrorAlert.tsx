import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { MarketplaceErrorDisplay } from "./marketplaceErrors";

export function MarketplaceErrorAlert(display: MarketplaceErrorDisplay) {
  return (
    <FeatureAlert className="marketplace-alert" title="Falha no marketplace">
      <dl>
        <div>
          <dt>Falhou</dt>
          <dd>{display.failed}</dd>
        </div>
        <div>
          <dt>Corrigir</dt>
          <dd>{display.fix}</dd>
        </div>
        <div>
          <dt>Provedor</dt>
          <dd>{display.provider}</dd>
        </div>
        <div>
          <dt>Veículo</dt>
          <dd>{display.vehicleLabel}</dd>
        </div>
        <div>
          <dt>Código para suporte</dt>
          <dd>{display.requestId}</dd>
        </div>
      </dl>
    </FeatureAlert>
  );
}
