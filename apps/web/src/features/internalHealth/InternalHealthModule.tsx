import {
  Activity,
  AlertTriangle,
  DatabaseZap,
  RefreshCcw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createInternalHealthApi, type InternalHealthApi } from "./apiClient";
import {
  AlertPanel,
  MetricCard,
  OperatorQueue,
  StatusBanner,
} from "./InternalHealthCards";
import {
  ActionTable,
  ActorTable,
  BreakdownList,
  RecentEvents,
  SinkTable,
} from "./InternalHealthTables";
import { createInternalHealthApiOptions } from "./runtimeApi";
import type { InternalHealthSnapshot } from "./types";

export function InternalHealthModule({ api }: { api?: InternalHealthApi }) {
  const healthApi = useMemo(() => api ?? createRuntimeHealthApi(), [api]);
  const [snapshot, setSnapshot] = useState<InternalHealthSnapshot | null>(null);
  const [status, setStatus] = useState<HealthStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setSnapshot(await healthApi.getHealth(100));
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
            Admin observability
          </span>
          <h2>Command center operacional</h2>
          <p>
            Auditoria, falhas do sink, atores, severidade e acoes criticas da
            loja atual em um painel de triagem.
          </p>
        </div>
        <button
          aria-label="Atualizar observabilidade"
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

      {snapshot ? <Dashboard snapshot={snapshot} /> : <LoadingState />}
    </main>
  );
}

function Dashboard({ snapshot }: { snapshot: InternalHealthSnapshot }) {
  return (
    <>
      <StatusBanner snapshot={snapshot} />
      <AlertPanel alerts={snapshot.alerts} />
      <OperatorQueue snapshot={snapshot} />
      <section className="internal-summary">
        <MetricCard
          icon={<Activity aria-hidden="true" className="size-5" />}
          label="Eventos"
          value={String(snapshot.summary.recentEvents)}
        />
        <MetricCard
          icon={<ShieldAlert aria-hidden="true" className="size-5" />}
          label="Criticos"
          value={String(snapshot.summary.criticalEvents)}
        />
        <MetricCard
          icon={<AlertTriangle aria-hidden="true" className="size-5" />}
          label="Negados"
          value={String(snapshot.summary.deniedEvents)}
        />
        <MetricCard
          icon={<DatabaseZap aria-hidden="true" className="size-5" />}
          label="Sink aberto"
          value={String(snapshot.summary.openSinkFailures)}
        />
        <MetricCard
          icon={<Users aria-hidden="true" className="size-5" />}
          label="Atores"
          value={String(snapshot.summary.uniqueActors)}
        />
      </section>
      <section className="internal-grid two">
        <BreakdownList items={snapshot.outcomeMetrics} title="Outcomes" />
        <BreakdownList items={snapshot.severityMetrics} title="Severidade" />
      </section>
      <section className="internal-grid two">
        <ActionTable items={snapshot.actionMetrics} />
        <ActorTable items={snapshot.actorMetrics} />
      </section>
      <section className="internal-grid two">
        <SinkTable
          failures={snapshot.failures}
          metrics={snapshot.sinkMetrics}
        />
        <RecentEvents events={snapshot.events} />
      </section>
    </>
  );
}

function LoadingState() {
  return (
    <section className="internal-empty">
      <Activity aria-hidden="true" className="size-5" />
      <strong>Carregando sinais internos</strong>
    </section>
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
