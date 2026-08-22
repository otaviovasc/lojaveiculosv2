import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
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
  HomeDashboard,
} from "../features/analytics/types";
import { DashboardHomeKpis } from "./DashboardHomeKpis";
import { DashboardHomeMainPanels } from "./DashboardHomeMainPanels";
import { createRuntimeAnalyticsApi } from "./DashboardHomeRuntime";
import { DashboardHomeSidebarPanel } from "./DashboardHomeSidebarPanel";
import { DashboardHomeToolbar } from "./DashboardHomeToolbar";
import { AppApiError, formatApiErrorDisplay } from "../lib/apiErrors";
import { Button } from "./ui/button";
import { FeatureAlert } from "./ui/FeatureStates";

type AppliedAnalyticsPeriod = {
  from: string;
  requestKey: number;
  to: string;
};

export function DashboardHome({
  api,
  canViewAnalytics,
  onNavigate,
}: {
  api?: AnalyticsApi;
  canViewAnalytics: boolean;
  onNavigate: (moduleId: ModuleId) => void;
}) {
  const analyticsApi = useMemo(() => api ?? createRuntimeAnalyticsApi(), [api]);
  const [homeDashboard, setHomeDashboard] = useState<HomeDashboard | null>(
    null,
  );
  const [analyticsDashboard, setAnalyticsDashboard] =
    useState<AnalyticsDashboard | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [isAnalyticsRefreshing, setIsAnalyticsRefreshing] = useState(false);
  const [status, setStatus] = useState<DashboardLoadStatus>({
    kind: "loading",
  });
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [resourceIndex, setResourceIndex] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(true);
  const latestAnalyticsRequestRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyState = getDashboardBodyState(status, homeDashboard);
  const publicStoreSlug = readRuntimeStoreSlug();

  const initialPeriodRef = useRef<{ endDate: Date; startDate: Date } | null>(
    null,
  );
  if (!initialPeriodRef.current) {
    const now = new Date();
    initialPeriodRef.current = {
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }
  const initialPeriod = initialPeriodRef.current;
  const [draftStartDate, setDraftStartDate] = useState(initialPeriod.startDate);
  const [draftEndDate, setDraftEndDate] = useState(initialPeriod.endDate);
  const [appliedAnalyticsPeriod, setAppliedAnalyticsPeriod] =
    useState<AppliedAnalyticsPeriod>(() => ({
      from: formatDashboardDate(initialPeriod.startDate),
      requestKey: 0,
      to: formatDashboardDate(initialPeriod.endDate),
    }));

  const refreshHome = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      setHomeDashboard(await analyticsApi.getHomeDashboard());
      setStatus({ kind: "ready" });
    } catch (error) {
      const statusCode =
        error instanceof AppApiError ? error.status : undefined;
      setStatus({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível carregar o painel gerencial.",
        ),
        ...(statusCode === undefined ? {} : { statusCode }),
      });
    }
  }, [analyticsApi]);

  useEffect(() => {
    void refreshHome();
  }, [refreshHome]);

  useEffect(() => {
    if (!canViewAnalytics) {
      latestAnalyticsRequestRef.current += 1;
      setAnalyticsDashboard(null);
      setAnalyticsError(null);
      setIsAnalyticsRefreshing(false);
      return;
    }

    const requestId = latestAnalyticsRequestRef.current + 1;
    latestAnalyticsRequestRef.current = requestId;
    setAnalyticsError(null);
    setIsAnalyticsRefreshing(true);
    void analyticsApi
      .getDashboard({
        from: appliedAnalyticsPeriod.from,
        to: appliedAnalyticsPeriod.to,
      })
      .then((dashboard) => {
        if (latestAnalyticsRequestRef.current !== requestId) return;
        setAnalyticsDashboard(dashboard);
      })
      .catch((error: unknown) => {
        if (latestAnalyticsRequestRef.current !== requestId) return;
        setAnalyticsError(
          formatApiErrorDisplay(
            error,
            "Não foi possível atualizar os indicadores.",
          ),
        );
      })
      .finally(() => {
        if (latestAnalyticsRequestRef.current !== requestId) return;
        setIsAnalyticsRefreshing(false);
      });

    return () => {
      if (latestAnalyticsRequestRef.current === requestId) {
        latestAnalyticsRequestRef.current = requestId + 1;
      }
    };
  }, [
    analyticsApi,
    appliedAnalyticsPeriod.from,
    appliedAnalyticsPeriod.requestKey,
    appliedAnalyticsPeriod.to,
    canViewAnalytics,
  ]);

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
    const linkText = `https://${publicStoreSlug}.lojaveiculos.com.br`;
    try {
      await navigator.clipboard.writeText(linkText);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // Browser denied clipboard access; the visible URL remains selectable.
    }
  };

  const applyDraftPeriod = () => {
    setAppliedAnalyticsPeriod((current) => ({
      from: formatDashboardDate(draftStartDate),
      requestKey: current.requestKey + 1,
      to: formatDashboardDate(draftEndDate),
    }));
  };

  const retryAppliedPeriod = () => {
    setAppliedAnalyticsPeriod((current) => ({
      ...current,
      requestKey: current.requestKey + 1,
    }));
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
        onRetry={() => void refreshHome()}
        status={status}
      />
    );
  }

  if (!homeDashboard) return null;

  const stats = createDashboardStats(analyticsDashboard);
  const isDraftPeriodDirty =
    formatDashboardDate(draftStartDate) !== appliedAnalyticsPeriod.from ||
    formatDashboardDate(draftEndDate) !== appliedAnalyticsPeriod.to;

  return (
    <div className="relative min-h-screen store-dashboard overflow-hidden">
      <main ref={containerRef} className="dashboard-main">
        <DashboardHomeToolbar
          copyState={copyState}
          isPeriodDirty={isDraftPeriodDirty}
          isRefreshing={isAnalyticsRefreshing}
          onApplyPeriod={applyDraftPeriod}
          onCopyLink={() => void handleCopyLink()}
          publicSlug={publicStoreSlug}
          startDate={draftStartDate}
          endDate={draftEndDate}
          onStartDateChange={setDraftStartDate}
          onEndDateChange={setDraftEndDate}
          canViewAnalytics={canViewAnalytics}
        />
        {analyticsError ? (
          <FeatureAlert
            action={
              <Button
                disabled={isAnalyticsRefreshing}
                onClick={retryAppliedPeriod}
                size="xs"
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" />
                Tentar novamente
              </Button>
            }
            icon={<AlertTriangle aria-hidden="true" className="size-4" />}
            title="Não foi possível atualizar os indicadores"
            tone="warning"
          >
            {analyticsDashboard
              ? `Os últimos dados carregados continuam visíveis. ${analyticsError}`
              : analyticsError}
          </FeatureAlert>
        ) : null}
        <DashboardHomeKpis
          canViewAnalytics={canViewAnalytics}
          onNavigate={onNavigate}
          stats={stats}
        />
        <div className="dashboard-panels-grid">
          <DashboardHomeMainPanels
            analyticsDashboard={analyticsDashboard}
            homeDashboard={homeDashboard}
            onNavigate={onNavigate}
            resourceIndex={resourceIndex}
            setResourceIndex={setResourceIndex}
          />
          <DashboardHomeSidebarPanel
            canViewAnalytics={canViewAnalytics}
            dashboard={analyticsDashboard}
            onNavigate={onNavigate}
            pushEnabled={pushEnabled}
            setPushEnabled={setPushEnabled}
          />
        </div>
      </main>
    </div>
  );
}

function formatDashboardDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
