import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModuleId } from "../app/modules";
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
  const stats = createDashboardStats(dashboard);
  const publicStoreSlug = readRuntimeStoreSlug();

  const refresh = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      setDashboard(await analyticsApi.getDashboard());
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [analyticsApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  if (!dashboard) {
    return (
      <div className="relative min-h-screen store-dashboard overflow-hidden">
        <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
        <main
          className="dashboard-main animate-pulse"
          role="status"
          aria-label="Carregando dashboard"
        >
          {/* Skeleton Toolbar */}
          <div className="dashboard-toolbar">
            <div className="h-16 flex-1 bg-panel/50 border border-line rounded-2xl" />
            <div className="h-16 flex-1 bg-panel/50 border border-line rounded-2xl" />
            <div className="h-16 flex-1 bg-panel/50 border border-line rounded-2xl" />
          </div>
          {/* Skeleton KPIs */}
          <div className="kpi-counters-grid mt-6">
            <div className="h-32 bg-panel/50 border border-line rounded-2xl" />
            <div className="h-32 bg-panel/50 border border-line rounded-2xl" />
            <div className="h-32 bg-panel/50 border border-line rounded-2xl" />
            <div className="h-32 bg-panel/50 border border-line rounded-2xl" />
          </div>
          {/* Skeleton Main Grid */}
          <div className="dashboard-panels-grid mt-6">
            <div className="dashboard-main-col flex flex-col gap-6">
              <div className="dashboard-sub-grid">
                <div className="h-80 bg-panel/50 border border-line rounded-2xl" />
                <div className="h-80 bg-panel/50 border border-line rounded-2xl" />
              </div>
              <div className="h-48 bg-panel/50 border border-line rounded-2xl" />
              <div className="h-64 bg-panel/50 border border-line rounded-2xl" />
            </div>
            <div className="h-[600px] bg-panel/50 border border-line rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <main ref={containerRef} className="dashboard-main">
        <DashboardHomeToolbar
          copyState={copyState}
          onCopyLink={() => void handleCopyLink()}
          onVisitStore={handleVisitStore}
          publicSlug={publicStoreSlug}
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
