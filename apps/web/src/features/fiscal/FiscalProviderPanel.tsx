import { PlugZap, ShieldAlert, ShieldCheck } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { getFiscalConfigurationLabels } from "./fiscalLabels";
import type { FiscalOverview } from "./types";

export function FiscalProviderPanel({
  onOpenConnection,
  overview,
}: {
  onOpenConnection?: () => void;
  overview: FiscalOverview;
}) {
  const configured = overview.provider.configured;
  const missingConfiguration = getFiscalConfigurationLabels(
    overview.provider.missingConfiguration,
  );

  return (
    <FeatureAlert
      action={
        onOpenConnection && !configured ? (
          <FeatureActionButton
            icon={PlugZap}
            label="Abrir conexão fiscal"
            onClick={onOpenConnection}
            title="Abrir a configuração da conexão fiscal"
          />
        ) : undefined
      }
      className="fiscal-shell-notice fiscal-provider-panel"
      icon={
        configured ? (
          <ShieldCheck aria-hidden="true" className="size-5" />
        ) : (
          <ShieldAlert aria-hidden="true" className="size-5" />
        )
      }
      title={
        <span className="fiscal-notice-header">
          <span className="fiscal-notice-title">
            {configured
              ? "Integração fiscal pronta"
              : "Integração fiscal incompleta"}
          </span>
          <span
            className={
              configured
                ? "fiscal-notice-badge fiscal-notice-badge--success"
                : "fiscal-notice-badge fiscal-notice-badge--warning"
            }
          >
            {configured ? "Operacional" : "Ação necessária"}
          </span>
        </span>
      }
      tone={configured ? "success" : "warning"}
    >
      <div className="fiscal-notice-text-wrap">
        <p className="fiscal-notice-body">
          {configured
            ? "Conexão, credencial e retorno de eventos estão prontos para uso."
            : "A emissão ficará bloqueada até os itens abaixo serem configurados."}
        </p>
        {!configured ? (
          <ul className="fiscal-provider-alert__list">
            {missingConfiguration.map((label) => (
              <li className="fiscal-provider-alert__item" key={label}>
                <span
                  aria-hidden="true"
                  className="fiscal-provider-alert__dot"
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </FeatureAlert>
  );
}
