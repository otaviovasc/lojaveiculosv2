import { CheckCircle2, PlugZap, RefreshCcw, XCircle } from "lucide-react";
import { useState } from "react";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import {
  buildFiscalReadinessChecklist,
  describeFiscalCertificate,
  getFiscalConnectionStatusLabel,
  getFiscalConnectionStatusTone,
  getFiscalDefaultsStatusLabel,
  getFiscalDefaultsStatusTone,
  listFiscalCapabilities,
} from "./fiscalConnectionDisplay";
import { formatFiscalDate } from "./fiscalLabels";
import type { FiscalConnection } from "./types";

type Props = {
  api: FiscalApi;
  connection: FiscalConnection;
  onConnectionChange: (connection: FiscalConnection) => void;
};

export function FiscalConnectionPanel({
  api,
  connection,
  onConnectionChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checklist = buildFiscalReadinessChecklist(connection);
  const capabilities = listFiscalCapabilities(connection.capabilities);
  const certificate = describeFiscalCertificate(
    connection.certificateExpiresAt,
  );

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      onConnectionChange(await api.syncConnection());
    } catch (cause) {
      setError(
        formatApiErrorDisplay(
          cause,
          "Não foi possível sincronizar com a Spedy. Nenhuma operação oficial foi executada.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <FeatureSection
      actions={
        <FeatureActionButton
          disabled={!connection.companyId}
          icon={RefreshCcw}
          isBusy={busy}
          label="Sincronizar"
          onClick={() => void sync()}
          title="Sincronizar capacidades e dados da empresa com a Spedy"
        />
      }
      className="feature-panel"
      description="Situação da conexão da loja com o provedor fiscal Spedy."
      icon={<PlugZap aria-hidden="true" className="size-5" />}
      title="Conexão com o provedor"
    >
      <div className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureStatusBadge
            tone={getFiscalConnectionStatusTone(connection.status)}
          >
            {getFiscalConnectionStatusLabel(connection.status)}
          </FeatureStatusBadge>
          <FeatureStatusBadge
            tone={getFiscalDefaultsStatusTone(connection.defaultsStatus)}
          >
            {getFiscalDefaultsStatusLabel(connection.defaultsStatus)}
          </FeatureStatusBadge>
          <FeatureStatusBadge tone={certificate.tone}>
            {`Certificado: ${certificate.label}`}
          </FeatureStatusBadge>
        </div>

        {connection.status === "ready" ? (
          <FeatureAlert tone="success">
            A conexão está pronta. A emissão de notas está liberada para a loja.
          </FeatureAlert>
        ) : (
          <ul className="grid gap-2" aria-label="Pendências da conexão fiscal">
            {checklist.map((item) => (
              <li
                className="flex items-center gap-2 text-sm font-bold"
                key={item.label}
              >
                {item.done ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-4 shrink-0 text-success-strong"
                  />
                ) : (
                  <XCircle
                    aria-hidden="true"
                    className="size-4 shrink-0 text-warning-strong"
                  />
                )}
                <span className={item.done ? "text-muted" : "text-app-text"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}

        {connection.lastErrorCode ? (
          <FeatureAlert>
            O provedor sinalizou um problema na última sincronização. Revise os
            dados da empresa e tente sincronizar novamente.
          </FeatureAlert>
        ) : null}

        {error ? <FeatureAlert>{error}</FeatureAlert> : null}

        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
              Empresa no provedor
            </dt>
            <dd className="mt-1 font-bold text-app-text">
              {connection.companyId ?? "Ainda não criada"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
              Certificado digital
            </dt>
            <dd className="mt-1 font-bold text-app-text">
              {certificate.detail}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
              Última sincronização
            </dt>
            <dd className="mt-1 font-bold text-app-text">
              {connection.lastSyncedAt
                ? formatFiscalDate(connection.lastSyncedAt)
                : "Nunca sincronizada"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
              Retorno de eventos
            </dt>
            <dd className="mt-1 font-bold text-app-text">
              {connection.webhookRegisteredAt
                ? `Registrado em ${formatFiscalDate(connection.webhookRegisteredAt)}`
                : "Ainda não registrado"}
            </dd>
          </div>
        </dl>

        {capabilities.length ? (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-accent">
              Capacidades disponíveis
            </h4>
            <ul className="mt-2 flex flex-wrap gap-2">
              {capabilities.map((capability) => (
                <li key={capability.key}>
                  <FeatureStatusBadge tone="blue">
                    {capability.label}
                  </FeatureStatusBadge>
                </li>
              ))}
            </ul>
          </div>
        ) : connection.companyId ? (
          <p className="text-sm font-medium text-muted">
            Nenhuma capacidade informada ainda. Sincronize com o provedor para
            importar os dados mais recentes.
          </p>
        ) : null}
      </div>
    </FeatureSection>
  );
}
