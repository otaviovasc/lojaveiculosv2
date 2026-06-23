import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  Bot,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Headset,
  Plus,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { ModuleId } from "../app/modules";
import { AnimatePresence, motion } from "motion/react";
import {
  createAnalyticsApi,
  type AnalyticsApi,
} from "../features/analytics/apiClient";
import {
  DASHBOARD_RESOURCE_CYCLE_MS,
  DASHBOARD_RESOURCE_PRESENCE_INITIAL,
  DASHBOARD_RESOURCE_PRESENCE_MODE,
  DASHBOARD_RESOURCE_SLIDE_CLASS,
  DASHBOARD_RESOURCE_SLIDE_TRANSITION,
  dashboardQuickActions,
  dashboardResources,
  getDashboardEntryMotion,
  getDashboardResource,
  getNextDashboardResourceIndex,
} from "../features/analytics/dashboardHomeAnimation";
import { createDashboardStats } from "../features/analytics/dashboardModel";
import { createAnalyticsApiOptions } from "../features/analytics/runtimeApi";
import type {
  AnalyticsDashboard,
  DashboardLoadStatus,
} from "../features/analytics/types";

interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  leadName: string;
  vehicleTitle?: string;
  columnName?: string;
  isOverdue?: boolean;
}

interface AgingVehicle {
  id: string;
  title: string;
  price: number;
  daysInStock: number;
  leadsCount: number;
  foto?: string;
  image?: string;
}

interface SellerPerformance {
  name: string;
  leadsConverted: number;
  totalSalesValue: number;
}

// Highly detailed mock data for high fidelity presentation when backend entities are empty
const MOCK_TASKS: UpcomingTask[] = [
  {
    id: "1",
    title: "Retornar contato WhatsApp",
    dueDate: "2026-06-25",
    leadName: "Carlos Eduardo Nogueira",
    vehicleTitle: "Chevrolet Onix 2021",
    columnName: "Primeiro Contato",
    isOverdue: false,
  },
  {
    id: "2",
    title: "Enviar proposta comercial",
    dueDate: "2026-06-21", // Overdue task
    leadName: "Maria da Penha Silva",
    vehicleTitle: "Jeep Compass 2022",
    columnName: "Negociação",
    isOverdue: true,
  },
  {
    id: "3",
    title: "Confirmar vistoria física",
    dueDate: "2026-06-24",
    leadName: "Pedro Henrique Ramos",
    vehicleTitle: "Toyota Corolla 2020",
    columnName: "Vistoria",
    isOverdue: false,
  },
];

const MOCK_AGING_VEHICLES: AgingVehicle[] = [
  {
    id: "1",
    title: "BMW 320i Active Flex 2.0",
    price: 189900,
    daysInStock: 45,
    leadsCount: 14,
    foto: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80",
  },
  {
    id: "2",
    title: "Volkswagen Golf GTI 2.0 Tsi",
    price: 142000,
    daysInStock: 32,
    leadsCount: 22,
    foto: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=400&q=80",
  },
  {
    id: "3",
    title: "Hyundai Creta Prestige 2.0",
    price: 104900,
    daysInStock: 28,
    leadsCount: 9,
    foto: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80",
  },
];

const MOCK_SELLERS: SellerPerformance[] = [
  { name: "Juliana Mendes", leadsConverted: 14, totalSalesValue: 1240000 },
  { name: "Rodrigo Almeida", leadsConverted: 9, totalSalesValue: 780000 },
  { name: "Marlos Pires", leadsConverted: 6, totalSalesValue: 490000 },
];

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

  const stats = createDashboardStats(dashboard);
  const currentResource = getDashboardResource(resourceIndex);
  const primaryBlobClass =
    resourceIndex === 0
      ? "w-full h-full rounded-full blur-3xl transition-colors duration-700 bg-blue-500"
      : resourceIndex === 1
        ? "w-full h-full rounded-full blur-3xl transition-colors duration-700 bg-emerald-500"
        : "w-full h-full rounded-full blur-3xl transition-colors duration-700 bg-violet-600";
  const secondaryBlobClass =
    resourceIndex === 0
      ? "w-full h-full rounded-full blur-3xl transition-colors duration-700 bg-sky-400"
      : resourceIndex === 1
        ? "w-full h-full rounded-full blur-3xl transition-colors duration-700 bg-green-400"
        : "w-full h-full rounded-full blur-3xl transition-colors duration-700 bg-pink-500";

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

  // Rotate resources every 5 seconds
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
      // Fallback
    }
  };

  const handleVisitStore = () => {
    const url = `https://${dashboard?.storeId || "test-store"}.lojaveiculos.com.br`;
    window.open(url, "_blank", "noopener");
  };

  const getKpiToneClass = (tone: string) => {
    switch (tone) {
      case "green":
        return "kpi-gradient-green";
      case "blue":
        return "kpi-gradient-blue";
      case "violet":
        return "kpi-gradient-violet";
      case "pink":
      default:
        return "kpi-gradient-pink";
    }
  };

  const getKpiIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("faturamento")) return Banknote;
    if (lowerLabel.includes("medio") || lowerLabel.includes("médio"))
      return Target;
    if (lowerLabel.includes("conversao") || lowerLabel.includes("conversão"))
      return TrendingUp;
    return Bot;
  };

  const getQuickActionIcon = (id: ModuleId) => {
    switch (id) {
      case "customers":
        return Headset;
      case "documents":
        return FileText;
      case "reports":
        return BarChart3;
      case "inventory":
      default:
        return Car;
    }
  };

  return (
    <main
      ref={containerRef}
      className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-8 px-2 md:px-4 py-8 store-dashboard"
    >
      {/* Control Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Store Status Tile */}
        <motion.div
          {...getDashboardEntryMotion(0.05)}
          className="glass-panel p-4.5 flex items-center justify-between transition-all duration-300"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shadow-inner">
              <CheckCircle2 className="size-5.5 shrink-0" />
            </div>
            <div>
              <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-0.5">
                Status da Loja
              </span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Loja Ativa
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Period Tile */}
        <motion.div
          {...getDashboardEntryMotion(0.1)}
          className="glass-panel p-4.5 flex items-center justify-between transition-all duration-300"
        >
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold shadow-inner">
              <CalendarDays className="size-5.5 shrink-0" />
            </div>
            <div>
              <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-0.5">
                Período
              </span>
              <span className="text-xs font-black text-primary uppercase tracking-wide">
                Últimos 30 Dias
              </span>
            </div>
          </div>
        </motion.div>

        {/* Public Link Tile */}
        <motion.div
          {...getDashboardEntryMotion(0.15)}
          className="glass-panel p-4.5 flex items-center justify-between transition-all duration-300"
        >
          <div className="flex-1 min-w-0 pr-3">
            <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-0.5">
              Link Público
            </span>
            <span
              className="text-xs font-bold text-primary truncate block hover:text-accent transition-colors cursor-pointer"
              onClick={handleVisitStore}
            >
              {dashboard?.storeId || "test-store"}.lojaveiculos.com.br
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void handleCopyLink()}
              className={
                "p-2.5 rounded-xl border transition-all duration-200 active:scale-95 shadow-sm cursor-pointer " +
                (copyState === "copied"
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                  : "bg-app-elevated border-line hover:border-line-strong/60 text-muted hover:text-primary")
              }
              title="Copiar Link"
            >
              {copyState === "copied" ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
            <button
              onClick={handleVisitStore}
              className="p-2.5 rounded-xl border bg-app-elevated border-line hover:border-line-strong/60 text-muted hover:text-primary transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
              title="Visitar Loja"
            >
              <Eye className="size-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const KpiIcon = getKpiIcon(stat.label);
          return (
            <motion.div
              key={stat.label}
              {...getDashboardEntryMotion(0.2 + idx * 0.05)}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`kpi-card-premium ${getKpiToneClass(stat.tone)} group cursor-pointer`}
            >
              {/* Dynamic Animated Blobs inside card */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-35 mix-blend-screen">
                <div className="absolute -left-10 -top-10 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-blob-1" />
                <div className="absolute -right-8 -bottom-10 w-28 h-28 bg-white/15 rounded-full blur-xl animate-blob-2" />
              </div>

              {/* Shine highlight */}
              <div className="gloss-overlay" />

              <div className="relative z-10 flex flex-col justify-between h-full min-h-[110px]">
                <div className="flex items-start justify-between w-full">
                  <div className="kpi-icon-container bg-white/20 border border-white/25 backdrop-blur-md rounded-2xl w-11 h-11 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <KpiIcon className="size-5.5 text-white" />
                  </div>
                  <span className="text-[9px] font-black text-white/90 bg-white/15 border border-white/20 px-2.5 py-1 rounded-full tracking-wider uppercase backdrop-blur-sm">
                    {stat.deltaLabel}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-[9px] uppercase font-black text-white/70 tracking-widest mb-1.5">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl.5 font-black tracking-tight leading-none text-white">
                    {stat.value}
                  </h3>
                </div>
              </div>
              <KpiIcon className="kpi-bg-icon text-white" />
            </motion.div>
          );
        })}
      </div>

      {/* Main Layout Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main column (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Agenda Card */}
            <motion.div
              {...getDashboardEntryMotion(0.4)}
              whileHover={{ y: -4 }}
              className="glass-panel flex flex-col h-full hover-scale-subtle"
            >
              <div className="p-5 border-b border-line flex items-center justify-between card-header-gradient">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center border border-blue-500/10">
                    <CalendarDays className="size-5" />
                  </div>
                  <h3 className="text-sm font-black text-primary uppercase tracking-wider">
                    Agenda Próxima
                  </h3>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-3">
                {MOCK_TASKS.map((task) => {
                  const date = new Date(task.dueDate);
                  return (
                    <div
                      key={task.id}
                      className="p-3 bg-app-elevated/40 dark:bg-white/5 border border-line/40 hover:border-line/70 rounded-xl hover:bg-panel dark:hover:bg-white/10 hover:shadow-sm transition-all duration-300 flex items-center gap-3.5 group cursor-pointer"
                    >
                      <div
                        className={
                          "agenda-date-box rounded-lg shadow-sm border transition-colors shrink-0 " +
                          (task.isOverdue
                            ? "bg-danger/10 text-danger border-danger/30"
                            : "bg-accent-soft text-accent border-accent/20")
                        }
                      >
                        <span className="text-[8px] font-black uppercase leading-none tracking-wider">
                          {date
                            .toLocaleDateString("pt-BR", { month: "short" })
                            .replace(".", "")}
                        </span>
                        <span className="text-base font-black leading-none mt-0.5">
                          {date.getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-primary truncate leading-tight group-hover:text-accent transition-colors">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted font-bold truncate">
                          <span className="opacity-95">{task.leadName}</span>
                          {task.columnName && (
                            <span className="px-1.5 py-0.5 bg-line text-[8px] rounded font-black uppercase text-primary border border-line-strong/20">
                              {task.columnName}
                            </span>
                          )}
                          {task.isOverdue && (
                            <span className="px-1.5 py-0.5 bg-danger/10 text-danger text-[8px] rounded font-black uppercase border border-danger/25 animate-pulse">
                              Atrasada
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="size-3.5 text-muted/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Lead Sources Card */}
            <motion.div
              {...getDashboardEntryMotion(0.45)}
              whileHover={{ y: -4 }}
              className="glass-panel flex flex-col h-full hover-scale-subtle"
            >
              <div className="p-5 border-b border-line flex items-center justify-between card-header-gradient">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-500 flex items-center justify-center border border-violet-500/10">
                    <Target className="size-5" />
                  </div>
                  <h3 className="text-sm font-black text-primary uppercase tracking-wider">
                    Canais de Lead
                  </h3>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col gap-4.5 justify-center">
                {dashboard?.leadSources && dashboard.leadSources.length > 0 ? (
                  dashboard.leadSources.slice(0, 3).map((source, idx) => {
                    const totalCount =
                      dashboard.leadSources.reduce(
                        (acc, curr) => acc + curr.value,
                        0,
                      ) || 1;
                    const percent = Math.round(
                      (source.value / totalCount) * 100,
                    );

                    let neonProgress = "neon-progress-green";
                    let dotClass = "w-2 h-2 rounded-full bg-emerald-500";
                    let textIndicatorClass = "font-black text-emerald-500";

                    if (idx === 1) {
                      neonProgress = "neon-progress-blue";
                      dotClass = "w-2 h-2 rounded-full bg-blue-500";
                      textIndicatorClass = "font-black text-blue-500";
                    } else if (idx >= 2) {
                      neonProgress = "neon-progress-violet";
                      dotClass = "w-2 h-2 rounded-full bg-violet-500";
                      textIndicatorClass = "font-black text-violet-500";
                    }

                    return (
                      <div key={source.key} className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className={dotClass} />
                            <span className="font-bold text-primary">
                              {source.label}
                            </span>
                          </div>
                          <span className={textIndicatorClass}>
                            {source.value}
                            <span className="text-[10px] ml-1 text-muted opacity-80 font-bold">
                              ({percent}%)
                            </span>
                          </span>
                        </div>
                        <div className="progress-container bg-app-elevated border border-line-strong/10 h-2.5">
                          <div
                            className={`progress-bar ${neonProgress}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <p className="text-xs font-bold text-muted">
                      Aguardando captação de leads.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Rotating promo banner */}
          <motion.div
            {...getDashboardEntryMotion(0.5)}
            className="rounded-[1.5rem] flex flex-col justify-between text-white shadow-xl min-h-[220px] relative overflow-hidden bg-zinc-950 border border-zinc-800"
          >
            {/* Dynamic animated color blobs behind text */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 mix-blend-screen">
              <div className="absolute -left-10 -top-10 w-44 h-44 animate-blob-1">
                <div className={primaryBlobClass} />
              </div>
              <div className="absolute -right-10 -bottom-10 w-44 h-44 animate-blob-2">
                <div className={secondaryBlobClass} />
              </div>
            </div>

            <AnimatePresence
              initial={DASHBOARD_RESOURCE_PRESENCE_INITIAL}
              mode={DASHBOARD_RESOURCE_PRESENCE_MODE}
            >
              <motion.div
                key={resourceIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={DASHBOARD_RESOURCE_SLIDE_TRANSITION}
                className={`${DASHBOARD_RESOURCE_SLIDE_CLASS} ${currentResource.panelClass}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 bg-white/15 border border-white/20 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
                      {currentResource.tag}
                    </span>
                    <h4 className="text-base font-black uppercase tracking-wider mt-3.5 text-white">
                      {currentResource.title}
                    </h4>
                  </div>
                  <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
                    <Sparkles className="size-5 text-white/90 animate-pulse" />
                  </div>
                </div>

                <p className="text-xs font-semibold text-white/80 leading-relaxed mt-4">
                  {currentResource.desc}
                </p>

                <div className="flex items-center justify-between mt-6">
                  <div className="flex gap-2">
                    {dashboardResources.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setResourceIndex(i);
                        }}
                        className={`carousel-dot ${i === resourceIndex ? "carousel-dot-active" : ""}`}
                        aria-label={`Mostrar slide ${i + 1}`}
                        type="button"
                      />
                    ))}
                  </div>

                  <button className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:gap-2.5 transition-all text-white bg-white/10 hover:bg-white/20 py-2 px-3.5 rounded-xl border border-white/15 backdrop-blur-sm cursor-pointer shadow-md">
                    <span>Saiba Mais</span>
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Aging Inventory Section */}
          <motion.div
            {...getDashboardEntryMotion(0.55)}
            whileHover={{ y: -4 }}
            className="glass-panel hover-scale-subtle"
          >
            <div className="p-6 border-b border-line flex items-center justify-between card-header-gradient">
              <div className="flex items-center gap-3">
                <div className="size-11 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 border border-amber-500/10 rounded-xl flex items-center justify-center shadow-inner">
                  <Clock className="size-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-primary">
                    Maior Tempo em Pátio
                  </h3>
                  <p className="text-xs text-muted font-bold">
                    Veículos prioritários para giro comercial
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Médio:
                </span>
                <span className="text-xs font-black">35 dias</span>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_AGING_VEHICLES.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-4 rounded-2xl bg-app-elevated/40 dark:bg-white/5 border border-line/40 hover:border-line/70 hover:bg-panel dark:hover:bg-white/10 hover:shadow-sm transition-all duration-300 group flex gap-4"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden relative flex-none border border-line-strong/20 bg-panel shadow-sm">
                    {vehicle.foto ? (
                      <img
                        src={vehicle.foto}
                        alt={vehicle.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-app-elevated" />
                    )}
                    <div className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-panel/90 dark:bg-black/80 rounded-md text-[10px] font-black text-amber-500 border border-amber-500/25 shadow-sm">
                      {vehicle.daysInStock}d
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h4 className="text-xs font-black text-primary truncate leading-tight mb-2 uppercase tracking-wide group-hover:text-accent transition-colors">
                      {vehicle.title}
                    </h4>
                    <div className="flex items-center gap-4 mb-3 text-[10px]">
                      <div className="flex flex-col">
                        <span className="font-bold text-muted uppercase leading-none mb-0.5 opacity-60">
                          Leads
                        </span>
                        <span className="font-black text-primary">
                          {vehicle.leadsCount}
                        </span>
                      </div>
                      <div className="w-px h-5 bg-line-strong/30" />
                      <div className="flex flex-col">
                        <span className="font-bold text-muted uppercase leading-none mb-0.5 opacity-60">
                          Preço
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            maximumFractionDigits: 0,
                          }).format(vehicle.price)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate("inventory")}
                      className="w-full py-1.5 bg-panel dark:bg-white/10 border border-line/60 hover:border-line-strong/60 hover:text-accent rounded-lg text-[10px] font-black uppercase text-muted hover:shadow-sm transition-all cursor-pointer"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar Column (1/3) */}
        <div className="flex flex-col gap-6">
          <motion.div
            {...getDashboardEntryMotion(0.6)}
            className="glass-panel p-6 flex flex-col gap-8 relative overflow-hidden"
          >
            {/* Ações Comerciais Block */}
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <Rocket className="size-4 text-accent" />
                  <span>Ações Comerciais</span>
                </h3>
              </div>

              <button
                onClick={() => onNavigate("inventory")}
                className="w-full flex items-center justify-between p-4.5 bg-accent hover:bg-accent-strong text-white rounded-xl shadow-md transition-all hover:scale-[1.01] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 -left-full group-hover:left-[150%] transition-all duration-1000 ease-out" />
                <div className="flex items-center gap-3 relative z-10">
                  <Plus className="size-5 text-white" />
                  <span className="text-sm font-black uppercase tracking-wider">
                    Novo Veículo
                  </span>
                </div>
                <ArrowRight className="size-4 text-white/70 relative z-10 group-hover:translate-x-0.5 transition-all" />
              </button>

              <div className="flex flex-col gap-2">
                {dashboardQuickActions.map((btn) => {
                  const BtnIcon = getQuickActionIcon(btn.id);
                  return (
                    <button
                      key={btn.id}
                      onClick={() => onNavigate(btn.id)}
                      className="w-full flex items-center justify-between p-3.5 bg-app-elevated/40 hover:bg-panel dark:hover:bg-white/10 border border-line/40 hover:border-line-strong/60 rounded-xl font-bold text-color-text transition-all duration-200 hover:translate-x-1 group cursor-pointer hover:shadow-sm"
                    >
                      <span className="flex items-center gap-3">
                        <BtnIcon className="size-4 text-muted group-hover:text-accent transition-colors" />
                        <span className="text-xs text-primary group-hover:text-accent transition-colors">
                          {btn.label}
                        </span>
                      </span>
                      <ArrowRight className="size-3.5 text-muted/60 group-hover:translate-x-0.5 group-hover:text-accent transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-line-strong/20" />

            {/* Top Vendedores Block (Performance do Mês) */}
            <div className="flex flex-col gap-5">
              <h4 className="text-[10px] font-black text-muted uppercase tracking-widest">
                Performance do Mês
              </h4>
              <div className="space-y-3.5">
                {MOCK_SELLERS.map((seller, idx) => {
                  let badgeStyle = "bg-panel border border-line text-muted";
                  if (idx === 0) {
                    badgeStyle =
                      "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-955 border border-amber-300/70 shadow-sm";
                  } else if (idx === 1) {
                    badgeStyle =
                      "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 border border-slate-300 shadow-sm";
                  } else if (idx === 2) {
                    badgeStyle =
                      "bg-gradient-to-br from-amber-600 to-amber-700 text-amber-50 border border-amber-600 shadow-sm";
                  }

                  return (
                    <div
                      key={seller.name}
                      className="flex items-center gap-3 p-3 bg-app-elevated/40 dark:bg-white/5 border border-line/40 hover:border-line/70 hover:bg-panel dark:hover:bg-white/10 rounded-2xl group transition-all duration-300 hover:shadow-sm cursor-pointer"
                    >
                      <div
                        className={`size-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${badgeStyle}`}
                      >
                        {idx + 1}º
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-black text-primary truncate leading-none mb-1.5 group-hover:text-accent transition-colors">
                          {seller.name}
                        </h5>
                        <div className="flex items-center justify-between text-[10px] text-muted">
                          <span className="font-bold">
                            {seller.leadsConverted} Vendas
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              maximumFractionDigits: 0,
                            }).format(seller.totalSalesValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-line-strong/20" />

            {/* Expansões & Add-ons Block */}
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-black text-muted uppercase tracking-widest">
                Expansões & Add-ons
              </h4>

              {/* Push Notifications Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-app-elevated/40 dark:bg-white/5 border border-line/40 rounded-2xl">
                <div>
                  <h5 className="text-xs font-black text-primary">
                    Notificações Push
                  </h5>
                  <p className="text-[9px] font-bold text-muted uppercase tracking-wider mt-0.5">
                    Alertas em tempo real
                  </p>
                </div>
                <button
                  onClick={() => setPushEnabled(!pushEnabled)}
                  className={
                    "w-10 h-6 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer shadow-sm " +
                    (pushEnabled
                      ? "bg-accent justify-end"
                      : "bg-line justify-start")
                  }
                >
                  <motion.div
                    layout
                    className="size-4 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              {/* WhatsApp CRM Button */}
              <button
                onClick={() => onNavigate("crm")}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-500/25 text-white rounded-2xl shadow-md transition-all hover:scale-[1.01] hover:-translate-y-0.5 duration-300 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 -left-full group-hover:left-[150%] transition-all duration-1000 ease-out" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="size-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                    <Headset className="size-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black tracking-wide text-left">
                      WhatsApp CRM
                    </h5>
                    <p className="text-[8px] font-black uppercase text-white/80 tracking-widest text-left mt-0.5">
                      Disparos & IA
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-white/20 rounded text-[8px] font-black uppercase tracking-wider relative z-10 border border-white/10">
                  Ativo
                </span>
              </button>

              {/* NF-e Emissor Button */}
              <button
                onClick={() => onNavigate("fiscal")}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-500/25 text-white rounded-2xl shadow-md transition-all hover:scale-[1.01] hover:-translate-y-0.5 duration-300 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 -left-full group-hover:left-[150%] transition-all duration-1000 ease-out" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="size-9 bg-white/15 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black tracking-wide text-left">
                      Emissor NF-e
                    </h5>
                    <p className="text-[8px] font-black uppercase text-white/80 tracking-widest text-left mt-0.5">
                      Faturamento ágil
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-white/20 rounded text-[8px] font-black uppercase tracking-wider relative z-10 border border-white/10">
                  Ativo
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

function createRuntimeAnalyticsApi(): AnalyticsApi {
  return {
    getDashboard: async () =>
      createAnalyticsApi(await createAnalyticsApiOptions()).getDashboard(),
  };
}
