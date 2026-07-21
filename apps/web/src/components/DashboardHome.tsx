import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModuleId } from "../app/modules";
import { PermissionRestrictedPanel } from "../features/account/PermissionRestrictedPanel";
import { readRuntimeStoreSlug } from "../features/account/currentStore";
import type { AnalyticsApi } from "../features/analytics/apiClient";
import {
  DASHBOARD_RESOURCE_CYCLE_MS,
  dashboardResources,
  getNextDashboardResourceIndex,
} from "../features/analytics/dashboardHomeAnimation";
import { createDashboardStats } from "../features/analytics/dashboardModel";
import { getDashboardBodyState } from "../features/analytics/dashboardViewState";
import type {
  AnalyticsDashboard,
  DashboardLoadStatus,
} from "../features/analytics/types";
import { DashboardHomeKpis } from "./DashboardHomeKpis";
import { DashboardHomeMainPanels } from "./DashboardHomeMainPanels";
import { createRuntimeAnalyticsApi } from "./DashboardHomeRuntime";
import { DashboardHomeSidebarPanel } from "./DashboardHomeSidebarPanel";
import { DashboardHomeToolbar } from "./DashboardHomeToolbar";
import { AppApiError, formatApiErrorDisplay } from "../lib/apiErrors";
import { Button } from "./ui/button";

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
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [resourceIndex, setResourceIndex] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyState = getDashboardBodyState(status, dashboard);
  const publicStoreSlug = readRuntimeStoreSlug();

  const [startDate, setStartDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  });

  const refresh = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      setDashboard(await analyticsApi.getDashboard());
      setStatus({ kind: "ready" });
    } catch (error) {
      const statusCode =
        error instanceof AppApiError ? error.status : undefined;
      setStatus({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Nao foi possivel carregar o painel gerencial.",
        ),
        ...(statusCode === undefined ? {} : { statusCode }),
      });
    }
  }, [analyticsApi]);

  useEffect(() => {
    void refresh();
  }, [refresh, startDate, endDate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResourceIndex((prev) =>
        getNextDashboardResourceIndex(prev, dashboardResources.length),
      );
    }, DASHBOARD_RESOURCE_CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const handleCopyLink = async () => {
    if (!publicStoreSlug) return;
    const linkText = `${publicStoreSlug}.lojaveiculos.com.br`;
    try {
      await navigator.clipboard.writeText(linkText);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Browser denied clipboard access; the visible URL remains selectable.
    }
  };

  const handleVisitStore = () => {
    if (!publicStoreSlug) return;
    const url = `https://${publicStoreSlug}.lojaveiculos.com.br`;
    window.open(url, "_blank", "noopener");
  };

  if (bodyState === "loading") {
    return (
      <div className="relative min-h-screen store-dashboard overflow-hidden">
        <main className="dashboard-main">
          <DashboardHomeLoadingSkeleton />
        </main>
      </div>
    );
  }

  if (bodyState === "none") {
    return (
      <DashboardHomeErrorState
        onNavigate={onNavigate}
        onRetry={() => void refresh()}
        status={status}
      />
    );
  }

  if (!dashboard) return null;

  const stats = createDashboardStats(dashboard);

  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <main ref={containerRef} className="dashboard-main">
        <DashboardHomeToolbar
          copyState={copyState}
          onCopyLink={() => void handleCopyLink()}
          onVisitStore={handleVisitStore}
          publicSlug={publicStoreSlug}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
        <DashboardHomeKpis stats={stats} />
        <div className="dashboard-panels-grid">
          <DashboardHomeMainPanels
            dashboard={dashboard}
            onNavigate={onNavigate}
            resourceIndex={resourceIndex}
            setResourceIndex={setResourceIndex}
          />
          <DashboardHomeSidebarPanel
            dashboard={dashboard}
            onNavigate={onNavigate}
            pushEnabled={pushEnabled}
            setPushEnabled={setPushEnabled}
          />
        </div>
      </main>
    </div>
  );
}

function DashboardHomeErrorState({
  onNavigate,
  onRetry,
  status,
}: {
  onNavigate: (moduleId: ModuleId) => void;
  onRetry: () => void;
  status: DashboardLoadStatus;
}) {
  if (isForbiddenDashboardError(status)) {
    return (
      <PermissionRestrictedPanel
        description="Seu perfil não tem acesso aos indicadores gerenciais. Use os módulos operacionais liberados no menu."
        title="Painel gerencial restrito"
      >
        <Button onClick={() => onNavigate("inventory")}>
          Ir para veículos
        </Button>
      </PermissionRestrictedPanel>
    );
  }

  return (
    <PermissionRestrictedPanel
      description="Tente novamente em instantes. Se continuar, acione o suporte com o horário da falha."
      title="Não foi possível carregar o painel"
    >
      <Button onClick={onRetry}>Tentar novamente</Button>
    </PermissionRestrictedPanel>
  );
}

function isForbiddenDashboardError(status: DashboardLoadStatus) {
  if (status.kind !== "error") return false;
  return (
    status.statusCode === 403 ||
    status.message.includes("status 403") ||
    status.message.includes("Missing permission")
  );
}

function DashboardHomeLoadingSkeleton() {
  return (
    <div
      aria-label="Carregando dashboard"
      className="flex flex-col gap-8"
      role="status"
    >
      <div aria-hidden="true" className="dashboard-toolbar">
        {[0, 1, 2].map((item) => (
          <div
            className="glass-panel-branded dashboard-control-tile animate-pulse"
            key={item}
          >
            <div className="flex items-center gap-3">
              <span className="block size-11 rounded-lg bg-app-elevated" />
              <span className="flex flex-col gap-2">
                <span className="block h-2 w-20 rounded bg-app-elevated" />
                <span className="block h-3 w-28 rounded bg-line" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="kpi-counters-grid">
        {[0, 1, 2, 3].map((item) => (
          <div
            className="glass-panel-branded min-h-[158px] animate-pulse p-6"
            key={item}
          >
            <div className="flex items-start justify-between">
              <span className="block size-11 rounded-lg bg-app-elevated" />
              <span className="block h-6 w-24 rounded-full bg-app-elevated" />
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <span className="block h-3 w-28 rounded bg-app-elevated" />
              <span className="block h-7 w-36 rounded bg-line" />
            </div>
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="dashboard-panels-grid">
        <div className="dashboard-main-col">
          <div className="dashboard-sub-grid">
            <SkeletonPanel />
            <SkeletonPanel />
          </div>
          <SkeletonPanel className="min-h-[220px]" />
          <SkeletonPanel className="min-h-[260px]" />
        </div>
        <div className="dashboard-sidebar-col">
          <SkeletonPanel className="min-h-[620px]" />
        </div>
      </div>
    </div>
  );
}

function SkeletonPanel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`glass-panel-branded dashboard-card min-h-[220px] animate-pulse ${className}`}
    >
      <div className="flex flex-col gap-4 p-6">
        <span className="block h-4 w-36 rounded bg-app-elevated" />
        <span className="block h-3 w-full rounded bg-line" />
        <span className="block h-3 w-3/4 rounded bg-app-elevated" />
      </div>
    </div>
  );
}
