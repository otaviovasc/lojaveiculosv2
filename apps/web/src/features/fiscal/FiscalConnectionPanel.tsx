import { CheckCircle2, PlugZap, RefreshCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureStatusBadge,
  type FeatureStatusTone,
} from "../../components/ui/FeatureStates";
import { Toast } from "../../components/ui/Toast";
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
  const [toast, setToast] = useState<{
    title: string;
    children?: string;
  } | null>(null);

  const checklist = buildFiscalReadinessChecklist(connection);
  const capabilities = listFiscalCapabilities(connection.capabilities);
  const certificate = describeFiscalCertificate(
    connection.certificateExpiresAt,
  );
  const statusTone = getFiscalConnectionStatusTone(connection.status);

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      onConnectionChange(await api.syncConnection());
      setToast({
        title: "Sincronização concluída.",
        children: "As capacidades e os dados da empresa foram atualizados.",
      });
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
    <section
      className={`fiscal-connection-hero fiscal-connection-hero--${heroToneClass(
        statusTone,
      )}`}
    >
      <span aria-hidden="true" className="fiscal-connection-hero__blob" />
      <span aria-hidden="true" className="fiscal-connection-hero__watermark">
        <PlugZap />
      </span>

      <header className="fiscal-connection-hero__header">
        <div className="min-w-0">
          <p className="fiscal-connection-hero__eyebrow">
            <PlugZap aria-hidden="true" className="size-4" />
            Conexão com o provedor
          </p>
          <h3 className="fiscal-connection-hero__title">
            {getFiscalConnectionStatusLabel(connection.status)}
          </h3>
          <p className="fiscal-connection-hero__description">
            Situação da conexão da loja com o provedor fiscal Spedy.
          </p>
          <div className="fiscal-connection-hero__badges">
            <FeatureStatusBadge
              tone={getFiscalDefaultsStatusTone(connection.defaultsStatus)}
            >
              {getFiscalDefaultsStatusLabel(connection.defaultsStatus)}
            </FeatureStatusBadge>
            <FeatureStatusBadge tone={certificate.tone}>
              {`Certificado: ${certificate.label}`}
            </FeatureStatusBadge>
          </div>
        </div>
        <FeatureActionButton
          disabled={!connection.companyId}
          icon={RefreshCcw}
          isBusy={busy}
          label="Sincronizar"
          onClick={() => void sync()}
          title="Sincronizar capacidades e dados da empresa com a Spedy"
          variant="primary"
        />
      </header>

      <div className="fiscal-connection-hero__body">
        {toast ? (
          <Toast
            durationMs={4000}
            onDismiss={() => setToast(null)}
            title={toast.title}
            tone="success"
          >
            {toast.children}
          </Toast>
        ) : null}

        {busy ? (
          <p className="fiscal-connection-sync-status" role="status">
            Sincronizando com a Spedy…
          </p>
        ) : null}

        {connection.status === "ready" ? (
          <FeatureAlert tone="success">
            A conexão está pronta. A emissão de notas está liberada para a loja.
          </FeatureAlert>
        ) : (
          <ul
            aria-label="Pendências da conexão fiscal"
            className="fiscal-connection-checklist"
          >
            {checklist.map((item) => (
              <li
                className={
                  item.done
                    ? "fiscal-connection-checklist__item fiscal-connection-checklist__item--done"
                    : "fiscal-connection-checklist__item fiscal-connection-checklist__item--pending"
                }
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
                <span>{item.label}</span>
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

        <dl className="fiscal-connection-meta">
          <div>
            <dt>Empresa no provedor</dt>
            <dd>{connection.companyId ?? "Ainda não criada"}</dd>
          </div>
          <div>
            <dt>Certificado digital</dt>
            <dd>{certificate.detail}</dd>
          </div>
          <div>
            <dt>Última sincronização</dt>
            <dd>
              {connection.lastSyncedAt
                ? formatFiscalDate(connection.lastSyncedAt)
                : "Nunca sincronizada"}
            </dd>
          </div>
          <div>
            <dt>Retorno de eventos</dt>
            <dd>
              {connection.webhookRegisteredAt
                ? `Registrado em ${formatFiscalDate(connection.webhookRegisteredAt)}`
                : "Ainda não registrado"}
            </dd>
          </div>
        </dl>

        {capabilities.length ? (
          <div>
            <h4 className="fiscal-connection-capabilities__title">
              Capacidades disponíveis
            </h4>
            <ul className="fiscal-connection-capabilities__list">
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
          <p className="fiscal-connection-capabilities__empty">
            Nenhuma capacidade informada ainda. Sincronize com o provedor para
            importar os dados mais recentes.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function heroToneClass(tone: FeatureStatusTone) {
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  if (tone === "danger" || tone === "pink") return "danger";
  return "neutral";
}
