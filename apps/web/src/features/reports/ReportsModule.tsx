import { AlertTriangle, BarChart3, Inbox, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeaturePageShell,
  FeatureSection,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createReportsApi, type ReportsApi } from "./apiClient";
import {
  getReportAgeBucketLabel,
  getReportFunnelLabel,
  getReportSourceLabel,
} from "./reportsLabels";
import { createReportsApiOptions } from "./runtimeApi";
import type { ReportsDashboard, ReportsPeriod } from "./types";
import "./reports.css";

type PeriodPreset = "7d" | "30d" | "90d" | "month";

const periodOptions: readonly {
  label: string;
  value: PeriodPreset;
}[] = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "Mês atual", value: "month" },
];

export function ReportsModule({ api }: { api?: ReportsApi }) {
  const reportsApi = useMemo(() => api ?? createRuntimeReportsApi(), [api]);
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [dashboard, setDashboard] = useState<ReportsDashboard | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });

  const refresh = useCallback(
    async (selected: PeriodPreset) => {
      setStatus({ kind: "loading" });
      try {
        setDashboard(await reportsApi.getDashboard(computePeriod(selected)));
        setStatus({ kind: "ready" });
      } catch (error) {
        setStatus({ kind: "error", message: errorMessage(error) });
      }
    },
    [reportsApi],
  );

  useEffect(() => {
    void refresh(preset);
  }, [preset, refresh]);

  return (
    <FeaturePageShell mainClassName="feature-shell">
      <FeatureToolbar className="reports-toolbar">
        <div className="reports-toolbar__identity">
          <p className="reports-toolbar__eyebrow">Desempenho</p>
          <h1>Relatórios</h1>
          <p className="reports-toolbar__description">
            Vendas, financeiro, estoque e funil comercial em um só lugar.
          </p>
        </div>
        <div
          aria-label="Ações dos relatórios"
          className="reports-toolbar__actions"
          role="toolbar"
        >
          <FeatureSelect
            ariaLabel="Período dos relatórios"
            className="reports-toolbar__period"
            density="compact"
            onChange={setPreset}
            options={periodOptions}
            value={preset}
          />
          <FeatureActionButton
            icon={RefreshCcw}
            isBusy={status.kind === "loading"}
            label="Atualizar"
            onClick={() => void refresh(preset)}
            title="Atualizar relatórios"
          />
          {dashboard ? (
            <span className="reports-toolbar__updated">
              Atualizado em {formatGeneratedAt(dashboard.generatedAt)}
            </span>
          ) : null}
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
              onClick={() => void refresh(preset)}
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
  const activeLeads = dashboard.leadFunnel
    .filter((step) => step.key !== "lost" && step.key !== "won")
    .reduce((total, step) => total + step.count, 0);

  const kpis = [
    { label: "Vendas", value: String(dashboard.sales.closedCount) },
    { label: "Receita", value: money(dashboard.sales.revenueCents) },
    { label: "Margem bruta", value: money(dashboard.sales.grossMarginCents) },
    {
      label: "A receber",
      value: money(dashboard.revenue.openReceivablesCents),
    },
    { label: "Leads ativos", value: String(activeLeads) },
    { label: "Estoque", value: String(dashboard.inventory.availableListings) },
  ];

  return (
    <div className="reports-dashboard">
      <section aria-label="Indicadores principais" className="reports-horizon">
        {kpis.map((kpi) => (
          <article className="reports-horizon__item" key={kpi.label}>
            <span className="reports-horizon__label">{kpi.label}</span>
            <strong className="reports-horizon__value">{kpi.value}</strong>
          </article>
        ))}
      </section>

      <FeatureSection className="reports-section-surface" title="Financeiro">
        <dl className="reports-facts-grid">
          <div className="reports-fact-cell">
            <dt>Recebido</dt>
            <dd>{money(dashboard.revenue.paidReceiptsCents)}</dd>
          </div>
          <div className="reports-fact-cell">
            <dt>A receber</dt>
            <dd>{money(dashboard.revenue.openReceivablesCents)}</dd>
          </div>
          <div className="reports-fact-cell">
            <dt>Vencido</dt>
            <dd
              className={
                dashboard.attention.overdueReceivablesCount > 0
                  ? "has-warning"
                  : undefined
              }
            >
              {money(dashboard.attention.overdueReceivablesCents)} ·{" "}
              {dashboard.attention.overdueReceivablesCount}{" "}
              {dashboard.attention.overdueReceivablesCount === 1
                ? "título"
                : "títulos"}
            </dd>
          </div>
          <div className="reports-fact-cell">
            <dt>Ticket médio</dt>
            <dd>{money(dashboard.sales.avgTicketCents)}</dd>
          </div>
        </dl>
      </FeatureSection>

      <FeatureSection className="reports-section-surface" title="Estoque">
        <div className="reports-inventory-deck">
          <span className="reports-inventory-deck__highlight">
            <strong>
              {dashboard.inventory.availableListings} de{" "}
              {dashboard.inventory.totalListings}
            </strong>{" "}
            veículos disponíveis
          </span>
          <span className="reports-inventory-deck__meta">
            {dashboard.inventory.reservedListings} reservados ·{" "}
            {dashboard.inventory.soldListings} vendidos · preço médio{" "}
            {money(dashboard.inventory.averagePriceCents)}
          </span>
        </div>
        <div className="reports-bars">
          {ageBucketEntries(dashboard).map(({ key, count }) => (
            <BarRow
              count={count}
              key={key}
              label={getReportAgeBucketLabel(key)}
              max={maxAgeBucket(dashboard)}
            />
          ))}
        </div>
      </FeatureSection>

      <section className="feature-grid two">
        <FeatureSection
          className="reports-section-surface"
          title="Funil comercial"
        >
          {dashboard.leadFunnel.length ? (
            <div className="reports-bars">
              {dashboard.leadFunnel.map((step) => (
                <BarRow
                  count={step.count}
                  key={step.key}
                  label={getReportFunnelLabel(step.key)}
                  max={Math.max(
                    ...dashboard.leadFunnel.map((item) => item.count),
                  )}
                />
              ))}
            </div>
          ) : (
            <FeatureEmptyState
              body="O funil ainda não possui oportunidades no período selecionado."
              density="compact"
              icon={Inbox}
              title="Sem dados de funil"
            />
          )}
        </FeatureSection>
        <FeatureSection
          className="reports-section-surface"
          title="Origem dos leads"
        >
          {dashboard.leadSources.length ? (
            <div className="reports-bars">
              {dashboard.leadSources.map((source) => (
                <BarRow
                  count={source.value}
                  key={source.key}
                  label={getReportSourceLabel(source.key)}
                  max={Math.max(
                    ...dashboard.leadSources.map((item) => item.value),
                  )}
                />
              ))}
            </div>
          ) : (
            <FeatureEmptyState
              body="As origens aparecerão quando os primeiros leads forem registrados."
              density="compact"
              icon={Inbox}
              title="Sem origens registradas"
            />
          )}
        </FeatureSection>
      </section>

      <FeatureSection
        className="reports-section-surface"
        title="Precisa de atenção"
      >
        {hasAttention(dashboard) ? (
          <ul className="reports-attention">
            {dashboard.attention.overdueReceivablesCount > 0 ? (
              <li>
                <AlertTriangle aria-hidden="true" className="size-4" />
                <span>
                  {dashboard.attention.overdueReceivablesCount}{" "}
                  {dashboard.attention.overdueReceivablesCount === 1
                    ? "recebível vencido"
                    : "recebíveis vencidos"}{" "}
                  somando{" "}
                  <strong>
                    {money(dashboard.attention.overdueReceivablesCents)}
                  </strong>
                </span>
              </li>
            ) : null}
            {dashboard.attention.pendingChecklistsCount > 0 ? (
              <li>
                <AlertTriangle aria-hidden="true" className="size-4" />
                <span>
                  {dashboard.attention.pendingChecklistsCount}{" "}
                  {dashboard.attention.pendingChecklistsCount === 1
                    ? "checklist pendente"
                    : "checklists pendentes"}{" "}
                  aguardando conclusão
                </span>
              </li>
            ) : null}
          </ul>
        ) : (
          <FeatureEmptyState
            body="Nenhum recebível vencido ou checklist pendente no momento."
            density="compact"
            icon={BarChart3}
            title="Tudo em dia"
            tone="green"
          />
        )}
      </FeatureSection>
    </div>
  );
}

function BarRow({
  count,
  label,
  max,
}: {
  count: number;
  label: string;
  max: number;
}) {
  return (
    <div className="reports-bar-row">
      <div className="reports-bar-row__header">
        <span>{label}</span>
        <strong>{count}</strong>
      </div>
      <div className="reports-progress-track">
        <div
          className="reports-progress-fill"
          style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

type AgeBucketKey = keyof ReportsDashboard["inventory"]["ageBuckets"];

function ageBucketEntries(dashboard: ReportsDashboard) {
  const buckets = dashboard.inventory.ageBuckets;
  return (Object.keys(buckets) as AgeBucketKey[]).map((key) => ({
    key,
    count: buckets[key],
  }));
}

function maxAgeBucket(dashboard: ReportsDashboard) {
  return Math.max(...ageBucketEntries(dashboard).map(({ count }) => count));
}

function hasAttention(dashboard: ReportsDashboard) {
  return (
    dashboard.attention.overdueReceivablesCount > 0 ||
    dashboard.attention.pendingChecklistsCount > 0
  );
}

function computePeriod(preset: PeriodPreset, now = new Date()): ReportsPeriod {
  const to = formatDate(now);
  if (preset === "month") {
    return {
      from: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to,
    };
  }
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return { from: formatDate(from), to };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type LoadStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

function createRuntimeReportsApi(): ReportsApi {
  return {
    getDashboard: async (period) =>
      createReportsApi(await createReportsApiOptions()).getDashboard(period),
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
