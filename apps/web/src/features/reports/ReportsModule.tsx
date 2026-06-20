import { BarChart3, RefreshCcw, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createReportsApi, type ReportsApi } from "./apiClient";
import { createReportsApiOptions } from "./runtimeApi";
import type { ReportsDashboard } from "./types";

export function ReportsModule({ api }: { api?: ReportsApi }) {
  const reportsApi = useMemo(() => api ?? createRuntimeReportsApi(), [api]);
  const [dashboard, setDashboard] = useState<ReportsDashboard | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setDashboard(await reportsApi.getDashboard());
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
            <BarChart3 aria-hidden="true" className="size-4" />
            Analytics
          </span>
          <h2>Relatorios gerenciais</h2>
          <p>Estoque, receita, margem, funil e origem de oportunidades.</p>
        </div>
        <button
          aria-label="Atualizar relatorios"
          className="feature-icon-action"
          onClick={() => void refresh()}
          title="Atualizar relatorios"
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
        </button>
      </section>

      {status.kind === "error" ? (
        <p className="feature-alert">{status.message}</p>
      ) : null}
      {dashboard ? (
        <Dashboard dashboard={dashboard} />
      ) : (
        <p className="feature-empty">Carregando relatorios</p>
      )}
    </main>
  );
}

function Dashboard({ dashboard }: { dashboard: ReportsDashboard }) {
  return (
    <>
      <section className="feature-grid four">
        {dashboard.kpis.map((kpi) => (
          <article className="feature-card" key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
            <small>{kpi.deltaLabel}</small>
          </article>
        ))}
      </section>
      <section className="feature-grid two">
        <section className="feature-panel">
          <h3>Funil comercial</h3>
          <div className="feature-bars">
            {dashboard.leadFunnel.map((step) => (
              <span key={step.key}>
                {step.label} <strong>{step.count}</strong>
              </span>
            ))}
          </div>
        </section>
        <section className="feature-panel">
          <h3>Origem dos leads</h3>
          <div className="feature-list compact">
            {dashboard.leadSources.map((source) => (
              <article key={source.key}>
                <strong>{source.label}</strong>
                <span>{source.value}</span>
              </article>
            ))}
          </div>
        </section>
      </section>
      <section className="feature-panel">
        <h3>Resumo financeiro</h3>
        <div className="feature-grid four">
          <Metric
            label="Vendas fechadas"
            value={money(dashboard.revenue.closedSalesCents)}
          />
          <Metric
            label="Margem bruta"
            value={money(dashboard.revenue.grossMarginCents)}
          />
          <Metric
            label="Recebiveis"
            value={money(dashboard.revenue.openReceivablesCents)}
          />
          <Metric
            label="Recebido"
            value={money(dashboard.revenue.paidReceiptsCents)}
          />
        </div>
      </section>
      <section className="feature-provider">
        <TrendingUp aria-hidden="true" className="size-5" />
        <span>
          {dashboard.inventory.availableListings}/
          {dashboard.inventory.totalListings} veiculos disponiveis
        </span>
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

type LoadStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" };

function createRuntimeReportsApi(): ReportsApi {
  return {
    getDashboard: async () =>
      createReportsApi(await createReportsApiOptions()).getDashboard(),
  };
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
