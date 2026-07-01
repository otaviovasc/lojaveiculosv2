import {
  ArrowRight,
  BarChart3,
  Car,
  FileText,
  Headset,
  Plus,
  Rocket,
} from "lucide-react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import type { ModuleId } from "../app/modules";
import { dashboardQuickActions } from "../features/analytics/dashboardHomeAnimation";
import type { AnalyticsDashboard } from "../features/analytics/types";
import { DashboardHomeEntry } from "./DashboardHomeEntry";

export function DashboardHomeSidebarPanel({
  dashboard,
  onNavigate,
  pushEnabled,
  setPushEnabled,
}: {
  dashboard: AnalyticsDashboard | null;
  onNavigate: (moduleId: ModuleId) => void;
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
}) {
  return (
    <div className="dashboard-sidebar-col">
      <DashboardHomeEntry delay={0.22}>
        <div className="glass-panel-branded dashboard-sidebar-panel">
          <div className="sidebar-block">
            <h3 className="sidebar-block-title">
              <Rocket className="size-4 text-accent" />
              <span>Ações Comerciais</span>
            </h3>
            <button
              onClick={() => onNavigate("inventory")}
              className="sidebar-btn-primary group"
            >
              <div className="btn-shine-overlay" />
              <div className="flex items-center gap-3 relative z-10">
                <Plus className="size-5 text-white" />
                <span className="text-sm font-black uppercase tracking-wider">
                  Novo Veículo
                </span>
              </div>
              <ArrowRight className="size-4 text-white/70 relative z-10 group-hover:translate-x-0.5 transition-all" />
            </button>
            <div className="sidebar-btn-list">
              {dashboardQuickActions.map((btn) => {
                const BtnIcon = getQuickActionIcon(btn.id);
                return (
                  <button
                    key={btn.id}
                    onClick={() => onNavigate(btn.id)}
                    className="sidebar-btn-secondary group"
                  >
                    <span className="flex items-center gap-3">
                      <BtnIcon className="size-4 sidebar-btn-secondary-icon" />
                      <span className="sidebar-btn-secondary-text">
                        {btn.label}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 text-muted/60 group-hover:translate-x-0.5 group-hover:text-accent transition-all" />
                  </button>
                );
              })}
            </div>
          </div>
          <SidebarDivider />
          <DashboardSellerPerformance dashboard={dashboard} />
          <SidebarDivider />
          <DashboardAddonsPanel
            onNavigate={onNavigate}
            pushEnabled={pushEnabled}
            setPushEnabled={setPushEnabled}
          />
        </div>
      </DashboardHomeEntry>
    </div>
  );
}

function DashboardSellerPerformance({
  dashboard,
}: {
  dashboard: AnalyticsDashboard | null;
}) {
  const soldListings = dashboard?.inventory.soldListings ?? 0;
  const closedSalesCents = dashboard?.revenue.closedSalesCents ?? 0;

  return (
    <div className="sidebar-block">
      <h4 className="sidebar-block-subtitle">Performance do Mês</h4>
      <div className="seller-list">
        {soldListings > 0 ? (
          <div className="seller-row group">
            <div className={`seller-badge-container ${sellerBadgeClass(0)}`}>
              Loja
            </div>
            <div className="seller-info">
              <h5 className="seller-name">Equipe comercial</h5>
              <div className="seller-stats">
                <span className="seller-leads">{soldListings} Vendas</span>
                <span className="seller-value">{money(closedSalesCents)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line/70 bg-app/40 p-4 text-sm font-bold text-muted">
            Nenhuma venda fechada neste período.
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardAddonsPanel({
  onNavigate,
  pushEnabled,
  setPushEnabled,
}: {
  onNavigate: (moduleId: ModuleId) => void;
  pushEnabled: boolean;
  setPushEnabled: (enabled: boolean) => void;
}) {
  return (
    <div className="sidebar-block">
      <h4 className="sidebar-block-subtitle">Expansões & Add-ons</h4>
      <div className="addon-row">
        <div>
          <h5 className="addon-row-title">Notificações Push</h5>
          <p className="addon-row-subtitle">Alertas em tempo real</p>
        </div>
        <button
          onClick={() => setPushEnabled(!pushEnabled)}
          className={
            "switch-toggle " +
            (pushEnabled ? "switch-toggle-active" : "switch-toggle-inactive")
          }
        >
          <motion.div layout className="switch-knob" />
        </button>
      </div>
      <AddonButton
        badge="Ativo"
        icon={<Headset className="size-4" />}
        onClick={() => onNavigate("crm")}
        subtitle="Disparos & IA"
        title="WhatsApp CRM"
        variant="whatsapp"
      />
      <AddonButton
        badge="Ativo"
        icon={<FileText className="size-4" />}
        onClick={() => onNavigate("fiscal")}
        subtitle="Faturamento ágil"
        title="Emissor NF-e"
        variant="nfe"
      />
    </div>
  );
}

function AddonButton({
  badge,
  icon,
  onClick,
  subtitle,
  title,
  variant,
}: {
  badge: string;
  icon: ReactNode;
  onClick: () => void;
  subtitle: string;
  title: string;
  variant: "whatsapp" | "nfe";
}) {
  return (
    <button
      onClick={onClick}
      className={`addon-card-premium addon-card-premium-${variant} group`}
    >
      <div className="btn-shine-overlay" />
      <div className="addon-card-content">
        <div className="addon-card-icon-container">{icon}</div>
        <div className="addon-card-details">
          <h5 className="addon-card-title">{title}</h5>
          <p className="addon-card-subtitle">{subtitle}</p>
        </div>
      </div>
      <span className="addon-card-badge">{badge}</span>
    </button>
  );
}

function SidebarDivider() {
  return <div className="border-t border-line-strong/20" />;
}

function getQuickActionIcon(id: ModuleId) {
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
}

function sellerBadgeClass(index: number) {
  if (index === 0) return "seller-badge-1";
  if (index === 1) return "seller-badge-2";
  if (index === 2) return "seller-badge-3";
  return "seller-badge-default";
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}
