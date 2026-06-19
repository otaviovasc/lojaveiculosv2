import {
  Activity,
  AlertTriangle,
  DatabaseZap,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createInternalHealthApi, type InternalHealthApi } from "./apiClient";
import { createInternalHealthApiOptions } from "./runtimeApi";
import type { InternalHealthSnapshot } from "./types";

export function InternalHealthModule({ api }: { api?: InternalHealthApi }) {
  const healthApi = useMemo(() => api ?? createRuntimeHealthApi(), [api]);
  const [snapshot, setSnapshot] = useState<InternalHealthSnapshot | null>(null);
  const [status, setStatus] = useState<HealthStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setSnapshot(await healthApi.getHealth(60));
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="internal-shell">
      <section className="internal-hero">
        <div>
          <span className="internal-badge">
            <Activity aria-hidden="true" className="size-4" />
            Observabilidade
          </span>
          <h2>Saude interna, auditoria e sinais de falha</h2>
          <p>
            Eventos sao filtrados pela loja atual. Falhas abertas do sink de
            auditoria aparecem sem mascarar requestId, tier e erro raiz.
          </p>
        </div>
        <button
          className="internal-icon-action"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
        </button>
      </section>

      {status.kind === "error" ? (
        <p className="internal-alert">{status.message}</p>
      ) : null}

      {snapshot ? (
        <>
          <section className="internal-summary">
            <MetricCard
              icon={<Activity aria-hidden="true" className="size-5" />}
              label="Eventos recentes"
              value={String(snapshot.summary.recentEvents)}
            />
            <MetricCard
              icon={<ShieldAlert aria-hidden="true" className="size-5" />}
              label="Criticos"
              value={String(snapshot.summary.criticalEvents)}
            />
            <MetricCard
              icon={<AlertTriangle aria-hidden="true" className="size-5" />}
              label="Falhas de evento"
              value={String(snapshot.summary.failedEvents)}
            />
            <MetricCard
              icon={<DatabaseZap aria-hidden="true" className="size-5" />}
              label="Sink aberto"
              value={String(snapshot.summary.openSinkFailures)}
            />
          </section>

          <section className="internal-grid two">
            <article className="internal-panel">
              <div className="internal-panel-title">
                <Activity aria-hidden="true" className="size-5" />
                <strong>Auditoria recente</strong>
              </div>
              <div className="internal-table">
                {snapshot.events.map((event) => (
                  <div className="internal-table-row" key={event.id}>
                    <span>{event.action}</span>
                    <span>
                      {event.actorKind}:{event.actorId}
                    </span>
                    <span>{event.outcome}</span>
                    <code>{event.requestId}</code>
                  </div>
                ))}
                {snapshot.events.length === 0 ? (
                  <p className="internal-muted">Nenhum evento recente.</p>
                ) : null}
              </div>
            </article>

            <article className="internal-panel">
              <div className="internal-panel-title">
                <DatabaseZap aria-hidden="true" className="size-5" />
                <strong>Falhas do audit sink</strong>
              </div>
              <div className="internal-list">
                {snapshot.failures.map((failure) => (
                  <div className="internal-row" key={failure.id}>
                    <div>
                      <strong>{failure.sinkName}</strong>
                      <small>
                        {failure.failureTier} · {failure.attempts} tentativas ·{" "}
                        {failure.requestId}
                      </small>
                      <code>{failure.lastError}</code>
                    </div>
                  </div>
                ))}
                {snapshot.failures.length === 0 ? (
                  <p className="internal-muted">Nenhuma falha aberta.</p>
                ) : null}
              </div>
            </article>
          </section>
        </>
      ) : (
        <section className="internal-empty">
          <Activity aria-hidden="true" className="size-5" />
          <strong>Carregando sinais internos</strong>
        </section>
      )}
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="internal-metric">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

type HealthStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" };

function createRuntimeHealthApi(): InternalHealthApi {
  return {
    getHealth: async (limit) =>
      createInternalHealthApi(await createInternalHealthApiOptions()).getHealth(
        limit,
      ),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
