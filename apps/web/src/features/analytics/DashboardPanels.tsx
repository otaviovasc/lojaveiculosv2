import {
  ArrowRight,
  CalendarDays,
  Car,
  FileText,
  Link2,
  RefreshCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ModuleId } from "../../app/modules";
import { StatCard } from "../../components/StatCard";
import type { AnalyticsDashboard, DashboardStatViewModel } from "./types";
import {
  inventoryRotationLabel,
  receivablesLabel,
  topLeadSources,
  totalLeads,
  updatedAtLabel,
} from "./dashboardModel";

type DashboardStatusToolbarProps = {
  dashboard: AnalyticsDashboard | null;
  isLoading: boolean;
  onRefresh: () => void;
};

type DashboardKpiGridProps = {
  stats: DashboardStatViewModel[];
};

type DashboardActionPanelProps = {
  onNavigate: (moduleId: ModuleId) => void;
};

type DashboardDataPanelProps = {
  dashboard: AnalyticsDashboard;
};

export function DashboardStatusToolbar({
  dashboard,
  isLoading,
  onRefresh,
}: DashboardStatusToolbarProps) {
  return (
    <section className="dashboard-toolbar" aria-label="Resumo da loja">
      <article className="dashboard-toolbar-card">
        <ShieldCheck aria-hidden="true" className="size-5 text-accent" />
        <div>
          <span>Controles</span>
          <strong>Indicadores auditaveis</strong>
        </div>
      </article>
      <article className="dashboard-toolbar-card">
        <CalendarDays aria-hidden="true" className="size-5 text-accent" />
        <div>
          <span>Atualizado</span>
          <strong>{updatedAtLabel(dashboard)}</strong>
        </div>
      </article>
      <article className="dashboard-toolbar-card">
        <Link2 aria-hidden="true" className="size-5 text-accent" />
        <div>
          <span>Loja</span>
          <strong>{dashboard ? "Loja atual" : "Carregando"}</strong>
        </div>
      </article>
      <button
        aria-label="Atualizar dashboard"
        className="dashboard-refresh"
        disabled={isLoading}
        onClick={onRefresh}
        type="button"
      >
        <RefreshCcw aria-hidden="true" className="size-5" />
      </button>
    </section>
  );
}

export function DashboardKpiGrid({ stats }: DashboardKpiGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </section>
  );
}

export function DashboardActionPanel({
  onNavigate,
}: DashboardActionPanelProps) {
  const actions = [
    { icon: Car, id: "inventory", label: "Novo estoque" },
    { icon: Users, id: "customers", label: "Clientes" },
    { icon: FileText, id: "documents", label: "Documentos" },
    { icon: ShieldCheck, id: "reports", label: "Relatorios" },
  ] as const;

  return (
    <aside className="dashboard-action-panel" aria-label="Acoes rapidas">
      <div>
        <p className="eyebrow">Painel de acoes</p>
        <h2>Operacao do dia</h2>
      </div>
      <div className="grid gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              className="dashboard-action-button"
              key={action.id}
              onClick={() => onNavigate(action.id)}
              type="button"
            >
              <span>
                <Icon aria-hidden="true" className="size-4" />
                {action.label}
              </span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function DashboardLeadPanel({ dashboard }: DashboardDataPanelProps) {
  const leadCount = totalLeads(dashboard);
  const sources = topLeadSources(dashboard);

  return (
    <section className="panel p-5 lg:p-6">
      <p className="eyebrow">Canais de lead</p>
      <h2 className="mt-1 text-xl font-black">{leadCount} oportunidades</h2>
      <div className="mt-5 grid gap-3">
        {sources.length > 0 ? (
          sources.map((source) => (
            <div className="dashboard-source-row" key={source.key}>
              <div className="flex items-center justify-between gap-3">
                <strong>{source.label}</strong>
                <span>{source.value}</span>
              </div>
              <div className="dashboard-progress-track">
                <div
                  className="dashboard-progress-fill"
                  style={{
                    width: `${leadCount ? (source.value / leadCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="dashboard-muted">Sem leads capturados no periodo.</p>
        )}
      </div>
    </section>
  );
}

export function DashboardOperationsPanel({
  dashboard,
}: DashboardDataPanelProps) {
  const panels = [
    {
      icon: Car,
      label: "Giro de estoque",
      text: inventoryRotationLabel(dashboard),
    },
    {
      icon: CalendarDays,
      label: "Recebiveis",
      text: receivablesLabel(dashboard),
    },
  ];

  return (
    <section className="panel p-5 lg:p-6">
      <p className="eyebrow">Fila de decisoes</p>
      <h2 className="mt-1 text-xl font-black">Sinais operacionais</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {panels.map((panel) => {
          const Icon = panel.icon;
          return (
            <article className="dashboard-decision-tile" key={panel.label}>
              <div className="dashboard-decision-icon">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <h3>{panel.label}</h3>
              <p>{panel.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardLoadingState() {
  return (
    <section className="panel dashboard-state-panel">
      <RefreshCcw aria-hidden="true" className="size-5" />
      <strong>Carregando analytics</strong>
    </section>
  );
}

export function DashboardErrorState({ message }: { message: string }) {
  return (
    <section className="panel dashboard-state-panel dashboard-state-error">
      <strong>{message}</strong>
    </section>
  );
}
