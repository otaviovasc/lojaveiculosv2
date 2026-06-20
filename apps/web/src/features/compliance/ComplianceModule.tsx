import { RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createComplianceApi, type ComplianceApi } from "./apiClient";
import { createComplianceApiOptions } from "./runtimeApi";
import type { ComplianceSnapshot, ComplianceStatus } from "./types";

export function ComplianceModule({ api }: { api?: ComplianceApi }) {
  const complianceApi = useMemo(
    () => api ?? createRuntimeComplianceApi(),
    [api],
  );
  const [snapshot, setSnapshot] = useState<ComplianceSnapshot | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setSnapshot(await complianceApi.getSnapshot());
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="feature-shell">
      <section className="feature-hero">
        <div>
          <span className="feature-badge">
            <ShieldCheck aria-hidden="true" className="size-4" />
            Compliance
          </span>
          <h2>Seguranca e LGPD</h2>
          <p>Controles, rotinas e riscos operacionais auditaveis.</p>
        </div>
        <button
          aria-label="Atualizar compliance"
          className="feature-icon-action"
          onClick={() => void refresh()}
          title="Atualizar compliance"
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
        </button>
      </section>
      {status.kind === "error" ? (
        <p className="feature-alert">{status.message}</p>
      ) : null}
      {snapshot ? (
        <Dashboard snapshot={snapshot} />
      ) : (
        <p className="feature-empty">Carregando compliance</p>
      )}
    </main>
  );
}

function Dashboard({ snapshot }: { snapshot: ComplianceSnapshot }) {
  return (
    <>
      <section className="feature-grid four">
        <Metric label="Score" value={`${snapshot.score}%`} />
        <Metric label="OK" value={String(snapshot.summary.ok)} />
        <Metric label="Atencao" value={String(snapshot.summary.attention)} />
        <Metric label="Bloqueados" value={String(snapshot.summary.blocked)} />
      </section>
      <section className="feature-grid two">
        <section className="feature-panel">
          <h3>Controles</h3>
          <div className="feature-list">
            {snapshot.controls.map((control) => (
              <article key={control.key}>
                <strong>{control.title}</strong>
                <Status status={control.status} />
                <small>{control.owner}</small>
              </article>
            ))}
          </div>
        </section>
        <section className="feature-panel">
          <h3>Workflows LGPD</h3>
          <div className="feature-list">
            {snapshot.workflows.map((workflow) => (
              <article key={workflow.key}>
                <strong>{workflow.title}</strong>
                <Status status={workflow.status} />
                <small>
                  {workflow.nextDueAt
                    ? dateLabel(workflow.nextDueAt)
                    : "sem prazo"}
                </small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="feature-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Status({ status }: { status: ComplianceStatus }) {
  return <span className={`feature-status ${status}`}>{status}</span>;
}

type LoadStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" };

function createRuntimeComplianceApi(): ComplianceApi {
  return {
    getSnapshot: async () =>
      createComplianceApi(await createComplianceApiOptions()).getSnapshot(),
  };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
