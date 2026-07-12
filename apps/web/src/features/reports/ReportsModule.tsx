import { BarChart3, Inbox, RefreshCcw, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageShell,
  FeatureSection,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createReportsApi, type ReportsApi } from "./apiClient";
import {
  getReportDeltaLabel,
  getReportFunnelLabel,
  getReportKpiLabel,
  getReportSourceLabel,
} from "./reportsLabels";
import { createReportsApiOptions } from "./runtimeApi";
import type { ReportsDashboard } from "./types";
import "./reports.css";

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
    <FeaturePageShell mainClassName="feature-shell">
      <FeatureToolbar className="reports-command-bar">
        <div className="reports-command-bar__identity">
          <span className="reports-command-bar__mark">
            <BarChart3 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="reports-command-bar__meta">
              <span>Desempenho</span>
              {dashboard ? (
                <span>
                  Atualizado em {formatGeneratedAt(dashboard.generatedAt)}
                </span>
              ) : null}
            </p>
            <h1>Relatórios gerenciais</h1>
            <p className="reports-command-bar__description">
              Estoque, receita, margem e evolução das oportunidades comerciais.
            </p>
          </div>
        </div>
        <div
          aria-label="Ações dos relatórios"
          className="reports-command-bar__actions"
          role="toolbar"
        >
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
            title="Atualizar relatórios"
          />
        </div>
      </FeatureToolbar>

      {status.kind === "error" ? (
        <FeatureAlert>{status.message}</FeatureAlert>
      ) : null}
      {dashboard ? (
        <Dashboard dashboard={dashboard} />
      ) : status.kind === "error" ? (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              icon={RefreshCcw}
              label="Tentar carregar novamente"
              onClick={() => void refresh()}
            />
          }
          body="Os indicadores não puderam ser consultados agora. Nenhum valor estimado foi exibido."
          icon={BarChart3}
          title="Relatórios indisponíveis"
        />
      ) : (
        <FeatureLoadingState>Carregando relatórios</FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

function Dashboard({ dashboard }: { dashboard: ReportsDashboard }) {
  return (
    <div className="reports-dashboard">
      <FeatureKpiStrip ariaLabel="Indicadores dos relatórios">
        {dashboard.kpis.map((kpi) => (
          <FeatureKpiCard
            icon={BarChart3}
            key={kpi.label}
            label={`${getReportKpiLabel(kpi.label)} · ${getReportDeltaLabel(kpi.deltaLabel)}`}
            tone={reportKpiTone(kpi.label)}
            value={kpi.value}
          />
        ))}
      </FeatureKpiStrip>
      <section className="feature-grid two">
        <FeatureSection className="feature-panel" title="Funil comercial">
          {dashboard.leadFunnel.length ? (
            <div className="feature-bars">
              {dashboard.leadFunnel.map((step) => (
                <span key={step.key}>
                  {getReportFunnelLabel(step.key)} <strong>{step.count}</strong>
                </span>
              ))}
            </div>
          ) : (
            <FeatureEmptyState
              body="O funil ainda não possui oportunidades no período atual."
              icon={Inbox}
              title="Sem dados de funil"
            />
          )}
        </FeatureSection>
        <FeatureSection className="feature-panel" title="Origem dos leads">
          {dashboard.leadSources.length ? (
            <div className="feature-list compact">
              {dashboard.leadSources.map((source) => (
                <article key={source.key}>
                  <strong>{getReportSourceLabel(source.key)}</strong>
                  <span>{source.value}</span>
                </article>
              ))}
            </div>
          ) : (
            <FeatureEmptyState
              body="As origens aparecerão quando os primeiros leads forem registrados."
              icon={Inbox}
              title="Sem origens registradas"
            />
          )}
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
            label="Recebíveis"
            tone="violet"
            value={money(dashboard.revenue.openReceivablesCents)}
          />
          <FeatureKpiCard
            icon={TrendingUp}
            label="Recebido"
            tone="green"
            value={money(dashboard.revenue.paidReceiptsCents)}
          />
        </FeatureKpiStrip>
      </FeatureSection>
      <FeatureSection
        className="feature-panel"
        description="Relação entre anúncios disponíveis e o estoque cadastrado."
        icon={<TrendingUp aria-hidden="true" className="size-5" />}
        title="Disponibilidade do estoque"
      >
        <p>
          {dashboard.inventory.availableListings}/
          {dashboard.inventory.totalListings} veículos disponíveis
        </p>
      </FeatureSection>
    </div>
  );
}

function reportKpiTone(label: string) {
  const normalized = getReportKpiLabel(label).toLocaleLowerCase("pt-BR");
  if (normalized.includes("vendas")) return "green" as const;
  if (normalized.includes("receb")) return "violet" as const;
  if (normalized.includes("lead")) return "blue" as const;
  return "violet" as const;
}

type LoadStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

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

function formatGeneratedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "horário não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível carregar os relatórios.",
  );
}
