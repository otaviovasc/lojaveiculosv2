import { ShieldAlert } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { getFiscalConfigurationLabels } from "./fiscalLabels";
import type { FiscalOverview } from "./types";

export function FiscalProviderPanel({
  overview,
}: {
  overview: FiscalOverview;
}) {
  const missingConfiguration = getFiscalConfigurationLabels(
    overview.provider.missingConfiguration,
  );

  return (
    <FeatureSection
      className="feature-panel"
      description={
        overview.provider.configured
          ? "Conexão, credencial e retorno de eventos estão prontos para uso."
          : "A emissão ficará bloqueada até os itens abaixo serem configurados."
      }
      icon={<ShieldAlert aria-hidden="true" className="size-5" />}
      title={
        overview.provider.configured
          ? "Integração fiscal pronta"
          : "Integração fiscal incompleta"
      }
    >
      {!overview.provider.configured ? (
        <ul className="mt-4 grid gap-2 pl-5 text-sm font-bold text-danger">
          {missingConfiguration.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
    </FeatureSection>
  );
}
