import { useCallback, useEffect, useMemo, useState } from "react";
import type { ModuleId } from "../app/modules";
import {
  createAnalyticsApi,
  type AnalyticsApi,
} from "../features/analytics/apiClient";
import { createDashboardStats } from "../features/analytics/dashboardModel";
import {
  DashboardActionPanel,
  DashboardErrorState,
  DashboardKpiGrid,
  DashboardLeadPanel,
  DashboardLoadingState,
  DashboardOperationsPanel,
  DashboardStatusToolbar,
} from "../features/analytics/DashboardPanels";
import { createAnalyticsApiOptions } from "../features/analytics/runtimeApi";
import type {
  AnalyticsDashboard,
  DashboardLoadStatus,
} from "../features/analytics/types";
import { LockedAddonPanel } from "./LockedAddonPanel";

export function DashboardHome({
  api,
  onNavigate,
}: {
  api?: AnalyticsApi;
  onNavigate: (moduleId: ModuleId) => void;
}) {
  const analyticsApi = useMemo(() => api ?? createRuntimeAnalyticsApi(), [api]);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [status, setStatus] = useState<DashboardLoadStatus>({
    kind: "loading",
  });
  const stats = createDashboardStats(dashboard);

  const refresh = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      setDashboard(await analyticsApi.getDashboard());
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  }, [analyticsApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <DashboardStatusToolbar
        dashboard={dashboard}
        isLoading={status.kind === "loading"}
        onRefresh={() => void refresh()}
      />

      {status.kind === "error" ? (
        <DashboardErrorState message={status.message} />
      ) : null}

      <DashboardKpiGrid stats={stats} />

      {dashboard ? (
        <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-5">
            <DashboardOperationsPanel dashboard={dashboard} />
            <DashboardLeadPanel dashboard={dashboard} />
          </div>
          <DashboardActionPanel onNavigate={onNavigate} />
        </section>
      ) : (
        <DashboardLoadingState />
      )}

      <section className="panel p-5 lg:p-6">
        <p className="eyebrow">V2 guardrails</p>
        <h2 className="mt-1 text-xl font-black">Sem degradacao escondida</h2>
        <p className="mt-3 text-sm font-semibold text-muted">
          O dashboard le o contrato analytics/internal do V2. A API valida
          permissao, entitlement, tenant/store scope, logs e auditoria antes de
          retornar os indicadores da loja.
        </p>
      </section>

      <LockedAddonPanel kind="crm" />
    </main>
  );
}

function createRuntimeAnalyticsApi(): AnalyticsApi {
  return {
    getDashboard: async () =>
      createAnalyticsApi(await createAnalyticsApiOptions()).getDashboard(),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
