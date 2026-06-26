import { BarChart3, RefreshCcw, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
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
    <FeaturePageShell className="feature-shell" variant="content">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
            title="Atualizar relatorios"
          />
        }
        description="Estoque, receita, margem, funil e origem de oportunidades."
        eyebrow="Analytics"
        title="Relatorios gerenciais"
      />

      {status.kind === "error" ? (
        <FeatureAlert>{status.message}</FeatureAlert>
      ) : null}
      {dashboard ? (
        <Dashboard dashboard={dashboard} />
      ) : (
        <FeatureLoadingState>Carregando relatorios</FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

function Dashboard({ dashboard }: { dashboard: ReportsDashboard }) {
  return (
    <>
      <FeatureKpiStrip ariaLabel="Indicadores dos relatórios">
        {dashboard.kpis.map((kpi) => (
          <FeatureKpiCard
            icon={BarChart3}
            key={kpi.label}
            label={kpi.label}
            tone="violet"
            value={`${kpi.value} ${kpi.deltaLabel}`}
          />
        ))}
      </FeatureKpiStrip>
      <section className="feature-grid two">
        <FeatureSection className="feature-panel" title="Funil comercial">
          <div className="feature-bars">
            {dashboard.leadFunnel.map((step) => (
              <span key={step.key}>
                {step.label} <strong>{step.count}</strong>
              </span>
            ))}
          </div>
        </FeatureSection>
        <FeatureSection className="feature-panel" title="Origem dos leads">
          <div className="feature-list compact">
            {dashboard.leadSources.map((source) => (
              <article key={source.key}>
                <strong>{source.label}</strong>
                <span>{source.value}</span>
              </article>
            ))}
          </div>
        </FeatureSection>
      </section>
      <FeatureSection className="feature-panel" title="Resumo financeiro">
        <FeatureKpiStrip ariaLabel="Resumo financeiro">
          <FeatureKpiCard
            icon={TrendingUp}
            label="Vendas fechadas"
            tone="green"
            value={money(dashboard.revenue.closedSalesCents)}
          />
          <FeatureKpiCard
            icon={TrendingUp}
            label="Margem bruta"
            tone="blue"
            value={money(dashboard.revenue.grossMarginCents)}
          />
          <FeatureKpiCard
            icon={TrendingUp}
            label="Recebiveis"
            tone="pink"
            value={money(dashboard.revenue.openReceivablesCents)}
          />
          <FeatureKpiCard
            icon={TrendingUp}
            label="Recebido"
            tone="violet"
            value={money(dashboard.revenue.paidReceiptsCents)}
          />
        </FeatureKpiStrip>
      </FeatureSection>
      <FeatureSection className="feature-provider">
        <TrendingUp aria-hidden="true" className="size-5" />
        <span>
          {dashboard.inventory.availableListings}/
          {dashboard.inventory.totalListings} veiculos disponiveis
        </span>
      </FeatureSection>
    </>
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
