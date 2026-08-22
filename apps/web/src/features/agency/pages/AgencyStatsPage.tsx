import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, RefreshCcw, ShieldCheck } from "lucide-react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { AgencyStatsPeriod, AgencyStatsReport } from "../apiClient";
import {
  AgencyTenantSelector,
  useAgencyTenantSelection,
} from "../useAgencyTenantSelection";
import {
  AgencyStatsFilters,
  AgencyStatsReportContent,
} from "./AgencyStatsParts";
import {
  formatPeriod,
  periodForDays,
  readAgencyStatsFilters,
} from "./AgencyStatsPage.model";
import { createRuntimeAgencyStatsApi } from "./AgencyStatsPage.runtime";

export function AgencyStatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { agencyTenant, agencyTenants, selectAgencyTenant } =
    useAgencyTenantSelection();
  const filters = useMemo(
    () => readAgencyStatsFilters(searchParams),
    [searchParams],
  );
  const [draftPeriod, setDraftPeriod] = useState(filters.period);
  const [report, setReport] = useState<AgencyStatsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const visibleReport =
    report?.tenantId === agencyTenant?.tenantId ? report : null;

  useEffect(() => setDraftPeriod(filters.period), [filters.period]);

  const loadStats = useCallback(async () => {
    if (!agencyTenant) {
      setLoading(false);
      setReport(null);
      return;
    }
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError(null);
    try {
      const api = await createRuntimeAgencyStatsApi();
      const nextReport = await api.getStats(agencyTenant.tenantId, {
        ...filters.period,
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
      });
      if (version === requestVersion.current) setReport(nextReport);
    } catch (error) {
      if (version === requestVersion.current) {
        setLoadError(
          formatApiErrorDisplay(
            error,
            "Não foi possível carregar as estatísticas da agência.",
          ),
        );
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [agencyTenant, filters.period.from, filters.period.to, filters.storeId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const updateFilters = useCallback(
    (period: AgencyStatsPeriod, storeId = filters.storeId) => {
      const next = new URLSearchParams();
      next.set("from", period.from);
      next.set("to", period.to);
      if (storeId) next.set("storeId", storeId);
      setSearchParams(next, { replace: true });
    },
    [filters.storeId, setSearchParams],
  );

  const selectedStore = visibleReport?.availableStores.find(
    (store) => store.storeId === filters.storeId,
  );

  return (
    <FeaturePageShell
      className="agency-stats-page relative animate-fade-in"
      variant="content"
    >
      <div aria-hidden="true" className="agency-stats-ambient" />
      <div aria-busy={loading || undefined} className="relative z-10 space-y-5">
        <FeaturePageHeader
          actions={
            <AgencyTenantSelector
              agencyTenant={agencyTenant}
              agencyTenants={agencyTenants}
              onChange={(tenantId) => {
                updateFilters(filters.period, undefined);
                selectAgencyTenant(tenantId);
              }}
            />
          }
          chip={
            visibleReport
              ? `${selectedStore?.storeName ?? "Rede completa"} · ${formatPeriod(filters.period)}`
              : undefined
          }
          description="Vendas, leads e estoque consolidados diretamente dos registros operacionais das lojas."
          eyebrow={
            <>
              <BarChart3 aria-hidden="true" className="size-4" />
              Desempenho comercial
            </>
          }
          title="Estatísticas da rede"
        />

        {!agencyTenant ? (
          <FeatureEmptyState
            body="Seu usuário não possui uma participação ativa em uma agência."
            icon={ShieldCheck}
            title="Acesso de agência necessário"
            tone="warning"
          />
        ) : (
          <>
            <AgencyStatsFilters
              draftPeriod={draftPeriod}
              onApplyPeriod={() => updateFilters(draftPeriod)}
              onDraftPeriodChange={setDraftPeriod}
              onPeriodPreset={(days) => updateFilters(periodForDays(days))}
              onStoreChange={(storeId) =>
                updateFilters(
                  filters.period,
                  storeId === "all" ? undefined : storeId,
                )
              }
              period={filters.period}
              report={visibleReport}
              {...(filters.storeId ? { storeId: filters.storeId } : {})}
            />

            {loading && !visibleReport ? (
              <FeatureLoadingState
                icon={BarChart3}
                title="Consolidando dados reais da rede"
              >
                <p>Calculando vendas, leads e posição atual do estoque.</p>
              </FeatureLoadingState>
            ) : null}

            {loadError ? (
              <FeatureAlert
                action={
                  <FeatureActionButton
                    icon={RefreshCcw}
                    isBusy={loading}
                    label="Tentar novamente"
                    onClick={() => void loadStats()}
                  />
                }
                title={
                  visibleReport
                    ? "Não foi possível atualizar o recorte"
                    : "Estatísticas indisponíveis"
                }
                tone="danger"
              >
                {loadError}
              </FeatureAlert>
            ) : null}

            {loading && visibleReport ? (
              <p className="agency-stats-refreshing" role="status">
                <RefreshCcw aria-hidden="true" /> Atualizando o recorte sem
                ocultar os dados anteriores
              </p>
            ) : null}

            {visibleReport ? (
              <AgencyStatsReportContent report={visibleReport} />
            ) : null}
          </>
        )}
      </div>
    </FeaturePageShell>
  );
}
