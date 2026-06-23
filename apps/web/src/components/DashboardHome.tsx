import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModuleId } from "../app/modules";
import type { AnalyticsApi } from "../features/analytics/apiClient";
import {
  DASHBOARD_RESOURCE_CYCLE_MS,
  dashboardResources,
  getNextDashboardResourceIndex,
} from "../features/analytics/dashboardHomeAnimation";
import { createDashboardStats } from "../features/analytics/dashboardModel";
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
  const [, setStatus] = useState<DashboardLoadStatus>({ kind: "loading" });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [resourceIndex, setResourceIndex] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const stats = createDashboardStats(dashboard);

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
    const linkText = `${dashboard?.storeId || "test-store"}.lojaveiculos.com.br`;
    try {
      await navigator.clipboard.writeText(linkText);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Browser denied clipboard access; the visible URL remains selectable.
    }
  };

  const handleVisitStore = () => {
    const url = `https://${dashboard?.storeId || "test-store"}.lojaveiculos.com.br`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <div className="fixed inset-0 bg-logo-pattern pointer-events-none" />
      <main ref={containerRef} className="dashboard-main">
        <DashboardHomeToolbar
          copyState={copyState}
          dashboard={dashboard}
          onCopyLink={() => void handleCopyLink()}
          onVisitStore={handleVisitStore}
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
            onNavigate={onNavigate}
            pushEnabled={pushEnabled}
            setPushEnabled={setPushEnabled}
          />
        </div>
      </main>
    </div>
  );
}
