import { ShieldAlert, ShieldCheck } from "lucide-react";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { getFiscalConfigurationLabels } from "./fiscalLabels";
import type { FiscalOverview } from "./types";

export function FiscalProviderPanel({
  overview,
}: {
  overview: FiscalOverview;
}) {
  const configured = overview.provider.configured;
  const missingConfiguration = getFiscalConfigurationLabels(
    overview.provider.missingConfiguration,
  );

  return (
    <FeatureAlert
      icon={
        configured ? (
          <ShieldCheck aria-hidden="true" className="size-4" />
        ) : (
          <ShieldAlert aria-hidden="true" className="size-4" />
        )
      }
      title={
        configured ? "Integração fiscal pronta" : "Integração fiscal incompleta"
      }
      tone={configured ? "success" : "warning"}
    >
      {configured
        ? "Conexão, credencial e retorno de eventos estão prontos para uso."
        : "A emissão ficará bloqueada até os itens abaixo serem configurados."}
      {!configured ? (
        <ul className="fiscal-provider-alert__list">
          {missingConfiguration.map((label) => (
            <li className="fiscal-provider-alert__item" key={label}>
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </FeatureAlert>
  );
}
