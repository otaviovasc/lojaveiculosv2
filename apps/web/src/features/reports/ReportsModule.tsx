import { BarChart3, GitCompareArrows, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FeatureDateField,
  FeatureSearchField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeaturePageShell,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createReportsApi, type ReportsApi } from "./apiClient";
import { CrmReport, InventoryReport } from "./CrmInventoryReports";
import { DocumentsReport, MarketingReport } from "./DocumentsMarketingReports";
import { FinanceReport } from "./FinanceReport";
import { OwnerReport } from "./OwnerReports";
import {
  formatPeriod,
  isValidPeriod,
  previousPeriod,
  readReportsViewState,
  resolvePeriod,
  syncReportsViewState,
  type PeriodPreset,
  type ReportsViewState,
} from "./reportPeriod";
import { ReportsNavigation } from "./ReportsNavigation";
import { createReportsApiOptions } from "./runtimeApi";
import type { ReportsDashboard, ReportsPeriod, ReportTab } from "./types";
import "./reports.css";

const periodOptions: readonly { label: string; value: PeriodPreset }[] = [
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
  { label: "Mês atual", value: "month" },
  { label: "Período personalizado", value: "custom" },
];

export function ReportsModule({ api }: { api?: ReportsApi }) {
  const reportsApi = useMemo(() => api ?? createRuntimeReportsApi(), [api]);
  const [view, setView] = useState<ReportsViewState>(readReportsViewState);
  const [dashboard, setDashboard] = useState<ReportsDashboard | null>(null);
  const [comparison, setComparison] = useState<ReportsDashboard | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>({ kind: "loading" });
  const requestVersion = useRef(0);
  const period = useMemo(
    () => resolvePeriod(view),
    [view.customPeriod.from, view.customPeriod.to, view.preset],
  );

  const load = useCallback(async () => {
    if (!isValidPeriod(period)) {
      setStatus({
        kind: "error",
        message: "Informe uma data inicial menor ou igual à data final.",
      });
      return;
    }
    const version = ++requestVersion.current;
    setStatus({ kind: "loading" });
    setComparisonError(null);
    const results = await Promise.allSettled([
      reportsApi.getDashboard(period),
      ...(view.compare
        ? [reportsApi.getDashboard(previousPeriod(period))]
        : []),
    ]);
    if (version !== requestVersion.current) return;
    const currentResult = results[0];
    if (!currentResult || currentResult.status === "rejected") {
      setStatus({
        kind: "error",
        message: errorMessage(currentResult?.reason),
      });
      return;
    }
    setDashboard(currentResult.value);
    setStatus({ kind: "ready" });
    const previousResult = results[1];
    if (!previousResult) {
      setComparison(null);
      return;
    }
    if (previousResult.status === "fulfilled") {
      setComparison(previousResult.value);
    } else {
      setComparison(null);
      setComparisonError(
        formatApiErrorDisplay(
          previousResult.reason,
          "O período anterior não pôde ser comparado.",
        ),
      );
    }
  }, [period, reportsApi, view.compare]);

  useEffect(() => {
    syncReportsViewState(view);
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const restoreFromUrl = () => setView(readReportsViewState());
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);

  const updateView = (patch: Partial<ReportsViewState>) =>
    setView((current) => ({ ...current, ...patch }));
  const searchable = view.tab === "sold" || view.tab === "costs";

  return (
    <FeaturePageShell mainClassName="feature-shell">
      <FeatureToolbar className="reports-toolbar">
        <div className="reports-toolbar__identity">
          <p className="reports-toolbar__eyebrow">Desempenho</p>
          <h1>Relatórios</h1>
          <p className="reports-toolbar__description">
            Margem por veículo, caixa, estoque, CRM e documentos.
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
            onChange={(preset) => updateView({ preset })}
            options={periodOptions}
            value={view.preset}
          />
          <button
            aria-pressed={view.compare}
            className="reports-compare"
            onClick={() => updateView({ compare: !view.compare })}
            type="button"
          >
            <GitCompareArrows aria-hidden="true" className="size-4" />
            Comparar
          </button>
          <FeatureActionButton
            icon={RefreshCcw}
            isBusy={status.kind === "loading"}
            label="Atualizar"
            onClick={() => void load()}
            title="Atualizar relatórios"
          />
        </div>
        {view.preset === "custom" ? (
          <div className="reports-custom-period">
            <FeatureDateField
              label="Data inicial"
              max={view.customPeriod.to}
              onChange={(from) =>
                updateView({
                  customPeriod: { ...view.customPeriod, from },
                })
              }
              value={view.customPeriod.from}
            />
            <FeatureDateField
              label="Data final"
              min={view.customPeriod.from}
              onChange={(to) =>
                updateView({ customPeriod: { ...view.customPeriod, to } })
              }
              value={view.customPeriod.to}
            />
          </div>
        ) : null}
        <div className="reports-toolbar__context">
          <span>{formatPeriod(period)}</span>
          {dashboard ? (
            <span>
              Atualizado em {formatGeneratedAt(dashboard.generatedAt)}
            </span>
          ) : null}
        </div>
      </FeatureToolbar>

      <ReportsNavigation
        onChange={(tab) => updateView({ tab })}
        value={view.tab}
      />

      {searchable ? (
        <FeatureSearchField
          className="reports-search"
          label="Buscar veículo no relatório"
          onChange={(event) =>
            updateView({ search: event.currentTarget.value })
          }
          placeholder="Buscar por veículo, placa ou data"
          value={view.search}
        />
      ) : null}

      {view.compare && isValidPeriod(period) ? (
        <div className="reports-comparison-note">
          <GitCompareArrows aria-hidden="true" className="size-4" />
          <span>
            Comparando {formatPeriod(period)} com{" "}
            {formatPeriod(previousPeriod(period))}
          </span>
        </div>
      ) : null}
      {comparisonError ? <FeatureAlert>{comparisonError}</FeatureAlert> : null}
      {status.kind === "error" ? (
        <FeatureAlert>{status.message}</FeatureAlert>
      ) : null}
      {dashboard ? (
        <div aria-busy={status.kind === "loading"}>
          <ReportContent
            comparison={comparison}
            dashboard={dashboard}
            search={view.search}
            tab={view.tab}
          />
        </div>
      ) : status.kind === "error" ? (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              icon={RefreshCcw}
              label="Tentar carregar novamente"
              onClick={() => void load()}
            />
          }
          body="A consulta falhou e nenhum valor estimado foi exibido. Tente novamente para buscar os dados oficiais."
          icon={BarChart3}
          title="Relatórios indisponíveis"
        />
      ) : (
        <FeatureLoadingState>Carregando relatórios</FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

function ReportContent({
  comparison,
  dashboard,
  search,
  tab,
}: {
  comparison: ReportsDashboard | null;
  dashboard: ReportsDashboard;
  search: string;
  tab: ReportTab;
}) {
  if (tab === "summary" || tab === "sold" || tab === "costs") {
    return (
      <OwnerReport
        comparison={comparison}
        dashboard={dashboard}
        search={search}
        tab={tab}
      />
    );
  }
  if (tab === "finance") {
    return <FinanceReport comparison={comparison} dashboard={dashboard} />;
  }
  if (tab === "crm") {
    return <CrmReport comparison={comparison} dashboard={dashboard} />;
  }
  if (tab === "inventory") {
    return <InventoryReport comparison={comparison} dashboard={dashboard} />;
  }
  if (tab === "documents") {
    return <DocumentsReport comparison={comparison} dashboard={dashboard} />;
  }
  return <MarketingReport dashboard={dashboard} />;
}

type LoadStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

function createRuntimeReportsApi(): ReportsApi {
  return {
    getDashboard: async (targetPeriod: ReportsPeriod) =>
      createReportsApi(await createReportsApiOptions()).getDashboard(
        targetPeriod,
      ),
  };
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
